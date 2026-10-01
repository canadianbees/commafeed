package com.commafeed.integration.rest;

import com.commafeed.TestConstants;
import com.commafeed.backend.video.VideoDownloadService.Status;
import com.commafeed.frontend.model.Entry;
import com.commafeed.frontend.model.VideoDownloadStatus;
import com.commafeed.frontend.model.VideoInfoResponse;
import com.commafeed.frontend.model.request.VideoPositionRequest;
import com.commafeed.frontend.resource.CategoryREST;
import com.commafeed.integration.BaseIT;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;

import org.apache.commons.io.IOUtils;
import org.apache.hc.core5.http.HttpStatus;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.mockserver.model.HttpRequest;
import org.mockserver.model.HttpResponse;

import java.io.IOException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@QuarkusTest
// the tests run a fake yt-dlp written as a shell script, which Windows can't execute
@DisabledOnOs(value = OS.WINDOWS, disabledReason = "fake yt-dlp is a shell script")
class VideoDownloadIT extends BaseIT {

    private Entry video;
    private Entry failingVideo;
    private Entry tiktokVideo;
    private Entry tiktokPhoto;

    @BeforeEach
    void setup() throws IOException {
        initialSetup(TestConstants.ADMIN_USERNAME, TestConstants.ADMIN_PASSWORD);
        RestAssured.authentication =
                RestAssured.preemptive()
                        .basic(TestConstants.ADMIN_USERNAME, TestConstants.ADMIN_PASSWORD);

        List<Entry> entries = subscribeToFeed("youtube");
        video =
                entries.stream()
                        .filter(e -> e.getUrl().endsWith("vid00000001"))
                        .findFirst()
                        .orElseThrow();
        failingVideo =
                entries.stream()
                        .filter(e -> e.getUrl().endsWith("fail0000000"))
                        .findFirst()
                        .orElseThrow();

        List<Entry> tiktokEntries = subscribeToFeed("tiktok");
        tiktokVideo =
                tiktokEntries.stream()
                        .filter(e -> e.getUrl().contains("/video/"))
                        .findFirst()
                        .orElseThrow();
        tiktokPhoto =
                tiktokEntries.stream()
                        .filter(e -> e.getUrl().contains("/photo/"))
                        .findFirst()
                        .orElseThrow();
    }

    private List<Entry> subscribeToFeed(String name) throws IOException {
        URL resource = Objects.requireNonNull(getClass().getResource("/feed/" + name + ".xml"));
        getMockServerClient()
                .when(HttpRequest.request().withMethod("GET").withPath("/" + name))
                .respond(
                        HttpResponse.response()
                                .withBody(IOUtils.toString(resource, StandardCharsets.UTF_8)));

        Long subscriptionId = subscribeAndWaitForEntries(getFeedUrl() + name);
        return getFeedEntries(subscriptionId).getEntries();
    }

    @AfterEach
    void cleanup() {
        RestAssured.reset();
    }

    @Test
    void entriesAreFlaggedAsDownloadableVideos() {
        Assertions.assertTrue(video.isDownloadableVideo());
        Assertions.assertTrue(tiktokVideo.isDownloadableVideo());
        Assertions.assertFalse(tiktokPhoto.isDownloadableVideo());
    }

    @Test
    void downloadAndStreamTiktokVideo() {
        RestAssured.given()
                .post("rest/entry/video/{id}", tiktokVideo.getId())
                .then()
                .statusCode(HttpStatus.SC_OK);

        awaitStatus(tiktokVideo.getId(), Status.DONE);

        byte[] content =
                RestAssured.given()
                        .get("rest/entry/video/{id}", tiktokVideo.getId())
                        .then()
                        .statusCode(HttpStatus.SC_OK)
                        .contentType("video/mp4")
                        .extract()
                        .asByteArray();
        Assertions.assertEquals("0123456789", new String(content, StandardCharsets.UTF_8));
    }

    @Test
    void videoDetailsAreReadFromTheVideoSite() {
        VideoInfoResponse info =
                RestAssured.given()
                        .get("rest/entry/video/{id}/info", video.getId())
                        .then()
                        .statusCode(HttpStatus.SC_OK)
                        .extract()
                        .as(VideoInfoResponse.class);
        Assertions.assertTrue(info.getDescription().startsWith("How the light was set up."));
        Assertions.assertEquals(1531.0, info.getDuration());
        Assertions.assertEquals(2, info.getChapters().size());
        Assertions.assertEquals("Setup", info.getChapters().get(1).title());
    }

    @Test
    void videoDetailsAreEmptyWhenUnavailable() {
        RestAssured.given()
                .get("rest/entry/video/{id}/info", failingVideo.getId())
                .then()
                .statusCode(HttpStatus.SC_NO_CONTENT);
    }

    @Test
    void statusesOfSeveralEntries() {
        RestAssured.given()
                .post("rest/entry/video/{id}", video.getId())
                .then()
                .statusCode(HttpStatus.SC_OK);
        awaitStatus(video.getId(), Status.DONE);

        Map<String, Object> statuses =
                RestAssured.given()
                        .queryParam("id", video.getId(), tiktokVideo.getId(), tiktokPhoto.getId())
                        .get("rest/entry/video/statuses")
                        .then()
                        .statusCode(HttpStatus.SC_OK)
                        .extract()
                        .jsonPath()
                        .getMap("");

        Assertions.assertEquals(Set.of(video.getId(), tiktokVideo.getId()), statuses.keySet());
        Assertions.assertEquals("DONE", ((Map<?, ?>) statuses.get(video.getId())).get("status"));
        Assertions.assertEquals(10, ((Map<?, ?>) statuses.get(video.getId())).get("size"));
        // other tests may have downloaded the tiktok video already, only check it is included
        Assertions.assertNotNull(((Map<?, ?>) statuses.get(tiktokVideo.getId())).get("status"));
    }

    @Test
    void savesWhereTheVideoWasStopped() {
        savePosition(video.getId(), 754.5).then().statusCode(HttpStatus.SC_OK);
        Assertions.assertEquals(754.5, reloadEntry(video.getId()).getVideoPosition());

        // cleared when the video was watched until the end
        savePosition(video.getId(), null).then().statusCode(HttpStatus.SC_OK);
        Assertions.assertNull(reloadEntry(video.getId()).getVideoPosition());
    }

    @Test
    void rejectsInvalidPositions() {
        savePosition(video.getId(), -1.0).then().statusCode(HttpStatus.SC_BAD_REQUEST);
    }

    @Test
    void otherUsersCannotSavePositions() {
        RestAssured.authentication = RestAssured.preemptive().basic("demo", "demo");
        savePosition(video.getId(), 10.0).then().statusCode(HttpStatus.SC_NOT_FOUND);
    }

    private io.restassured.response.Response savePosition(String entryId, Double position) {
        VideoPositionRequest req = new VideoPositionRequest();
        req.setPosition(position);
        return RestAssured.given()
                .body(req)
                .contentType(ContentType.JSON)
                .post("rest/entry/video/{id}/position", entryId);
    }

    private Entry reloadEntry(String entryId) {
        return getCategoryEntries(CategoryREST.ALL).getEntries().stream()
                .filter(e -> e.getId().equals(entryId))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void tiktokPhotoPostIsNotDownloadable() {
        RestAssured.given()
                .post("rest/entry/video/{id}", tiktokPhoto.getId())
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
    }

    @Test
    void downloadAndStreamVideo() {
        VideoDownloadStatus requested =
                RestAssured.given()
                        .post("rest/entry/video/{id}", video.getId())
                        .then()
                        .statusCode(HttpStatus.SC_OK)
                        .extract()
                        .as(VideoDownloadStatus.class);
        Assertions.assertNotEquals(Status.FAILED, requested.getStatus());

        awaitStatus(video.getId(), Status.DONE);

        byte[] full =
                RestAssured.given()
                        .get("rest/entry/video/{id}", video.getId())
                        .then()
                        .statusCode(HttpStatus.SC_OK)
                        .header("Accept-Ranges", "bytes")
                        .contentType("video/mp4")
                        .extract()
                        .asByteArray();
        Assertions.assertEquals("0123456789", new String(full, StandardCharsets.UTF_8));

        byte[] partial =
                RestAssured.given()
                        .header("Range", "bytes=2-4")
                        .get("rest/entry/video/{id}", video.getId())
                        .then()
                        .statusCode(HttpStatus.SC_PARTIAL_CONTENT)
                        .header("Content-Range", "bytes 2-4/10")
                        .extract()
                        .asByteArray();
        Assertions.assertEquals("234", new String(partial, StandardCharsets.UTF_8));

        RestAssured.given()
                .header("Range", "bytes=50-")
                .get("rest/entry/video/{id}", video.getId())
                .then()
                .statusCode(HttpStatus.SC_REQUESTED_RANGE_NOT_SATISFIABLE);
    }

    @Test
    void failedDownloadReportsError() {
        RestAssured.given()
                .post("rest/entry/video/{id}", failingVideo.getId())
                .then()
                .statusCode(HttpStatus.SC_OK);

        VideoDownloadStatus status = awaitStatus(failingVideo.getId(), Status.FAILED);
        Assertions.assertTrue(status.getError().contains("Private video"));

        RestAssured.given()
                .get("rest/entry/video/{id}", failingVideo.getId())
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
    }

    @Test
    void otherUsersCannotAccessVideo() {
        RestAssured.authentication = RestAssured.preemptive().basic("demo", "demo");

        RestAssured.given()
                .post("rest/entry/video/{id}", video.getId())
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
        RestAssured.given()
                .get("rest/entry/video/{id}/status", video.getId())
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
        RestAssured.given()
                .get("rest/entry/video/{id}", video.getId())
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
    }

    @Test
    void unknownEntryReturnsNotFound() {
        RestAssured.given()
                .get("rest/entry/video/{id}/status", 999999)
                .then()
                .statusCode(HttpStatus.SC_NOT_FOUND);
    }

    private VideoDownloadStatus awaitStatus(String entryId, Status status) {
        return Awaitility.await()
                .atMost(Duration.ofSeconds(15))
                .until(
                        () ->
                                RestAssured.given()
                                        .get("rest/entry/video/{id}/status", entryId)
                                        .then()
                                        .statusCode(HttpStatus.SC_OK)
                                        .extract()
                                        .as(VideoDownloadStatus.class),
                        s -> s.getStatus() == status);
    }
}
