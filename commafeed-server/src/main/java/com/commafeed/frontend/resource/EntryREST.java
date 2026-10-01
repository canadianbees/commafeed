package com.commafeed.frontend.resource;

import com.commafeed.backend.dao.FeedEntryDAO;
import com.commafeed.backend.dao.FeedEntryTagDAO;
import com.commafeed.backend.dao.FeedSubscriptionDAO;
import com.commafeed.backend.dao.UnitOfWork;
import com.commafeed.backend.model.FeedEntry;
import com.commafeed.backend.model.User;
import com.commafeed.backend.service.FeedEntryService;
import com.commafeed.backend.service.FeedEntryTagService;
import com.commafeed.backend.video.ByteRange;
import com.commafeed.backend.video.VideoDownloadService;
import com.commafeed.backend.video.VideoInfoService;
import com.commafeed.backend.video.VideoSource;
import com.commafeed.backend.video.VideoUrlParser;
import com.commafeed.frontend.model.VideoDownloadStatus;
import com.commafeed.frontend.model.VideoInfoResponse;
import com.commafeed.frontend.model.request.MarkRequest;
import com.commafeed.frontend.model.request.MultipleMarkRequest;
import com.commafeed.frontend.model.request.StarRequest;
import com.commafeed.frontend.model.request.TagRequest;
import com.commafeed.frontend.model.request.VideoPositionRequest;
import com.commafeed.security.AuthenticationContext;
import com.commafeed.security.Roles;
import com.google.common.base.Preconditions;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;

import lombok.RequiredArgsConstructor;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Path("/rest/entry")
@RolesAllowed(Roles.USER)
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
@Singleton
@Tag(name = "Feed entries")
public class EntryREST {

    private static final int MAX_VIDEO_STATUSES = 200;

    private final AuthenticationContext authenticationContext;
    private final FeedEntryTagDAO feedEntryTagDAO;
    private final FeedEntryService feedEntryService;
    private final FeedEntryTagService feedEntryTagService;
    private final FeedEntryDAO feedEntryDAO;
    private final FeedSubscriptionDAO feedSubscriptionDAO;
    private final VideoDownloadService videoDownloadService;
    private final VideoInfoService videoInfoService;
    private final UnitOfWork unitOfWork;

    @Path("/mark")
    @POST
    @Transactional
    @Operation(summary = "Mark a feed entry", description = "Mark a feed entry as read/unread")
    public Response markEntry(
            @Valid @Parameter(description = "Mark Request", required = true) MarkRequest req) {
        Preconditions.checkNotNull(req);
        Preconditions.checkNotNull(req.getId());

        User user = authenticationContext.getCurrentUser();
        feedEntryService.markEntry(user, Long.valueOf(req.getId()), req.isRead());
        return Response.ok().build();
    }

    @Path("/markMultiple")
    @POST
    @Transactional
    @Operation(
            summary = "Mark multiple feed entries",
            description = "Mark feed entries as read/unread")
    public Response markEntries(
            @Valid @Parameter(description = "Multiple Mark Request", required = true)
                    MultipleMarkRequest req) {
        Preconditions.checkNotNull(req);
        Preconditions.checkNotNull(req.getRequests());

        User user = authenticationContext.getCurrentUser();
        for (MarkRequest r : req.getRequests()) {
            Preconditions.checkNotNull(r.getId());
            feedEntryService.markEntry(user, Long.valueOf(r.getId()), r.isRead());
        }

        return Response.ok().build();
    }

    @Path("/star")
    @POST
    @Transactional
    @Operation(summary = "Star a feed entry", description = "Mark a feed entry as read/unread")
    public Response starEntry(
            @Valid @Parameter(description = "Star Request", required = true) StarRequest req) {
        Preconditions.checkNotNull(req);
        Preconditions.checkNotNull(req.getId());

        User user = authenticationContext.getCurrentUser();
        feedEntryService.starEntry(user, Long.valueOf(req.getId()), req.isStarred());

        return Response.ok().build();
    }

    @Path("/tags")
    @GET
    @Transactional
    @Operation(
            summary = "Get list of tags for the user",
            description = "Get list of tags for the user")
    public Response getTags() {
        User user = authenticationContext.getCurrentUser();
        List<String> tags = feedEntryTagDAO.findByUser(user);
        return Response.ok(tags).build();
    }

    @Path("/tag")
    @POST
    @Transactional
    @Operation(summary = "Set feed entry tags")
    public Response tagEntry(
            @Valid @Parameter(description = "Tag Request", required = true) TagRequest req) {
        Preconditions.checkNotNull(req);
        Preconditions.checkNotNull(req.getEntryId());

        User user = authenticationContext.getCurrentUser();
        feedEntryTagService.updateTags(user, req.getEntryId(), req.getTags());

        return Response.ok().build();
    }

    @Path("/video/{id}")
    @POST
    @Transactional
    @Consumes(MediaType.WILDCARD)
    @Operation(
            summary = "Download the video of a feed entry",
            description = "Queue the download of the entry's video on the server")
    public Response requestVideo(
            @Parameter(description = "entry id", required = true) @PathParam("id") Long id) {
        Optional<VideoSource> video = findVideo(id);
        if (video.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(VideoDownloadStatus.from(videoDownloadService.request(video.get())))
                .build();
    }

    @Path("/video/{id}/status")
    @GET
    @Transactional
    @Operation(summary = "Get the download status of the video of a feed entry")
    public Response getVideoStatus(
            @Parameter(description = "entry id", required = true) @PathParam("id") Long id) {
        Optional<VideoSource> video = findVideo(id);
        if (video.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(VideoDownloadStatus.from(videoDownloadService.status(video.get())))
                .build();
    }

    @Path("/video/{id}")
    @GET
    @Transactional
    @Produces("video/mp4")
    @Operation(
            summary = "Stream the downloaded video of a feed entry",
            description = "Supports HTTP range requests")
    public Response getVideo(
            @Parameter(description = "entry id", required = true) @PathParam("id") Long id,
            @HeaderParam("Range") String rangeHeader)
            throws IOException {
        Optional<VideoSource> video = findVideo(id);
        if (video.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        java.nio.file.Path file = videoDownloadService.resolveFile(video.get());
        if (!Files.isRegularFile(file)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        long size = Files.size(file);
        if (rangeHeader == null) {
            return Response.ok(streamFile(file, 0, size), "video/mp4")
                    .header(HttpHeaders.CONTENT_LENGTH, size)
                    .header("Accept-Ranges", "bytes")
                    .build();
        }

        Optional<ByteRange> range = ByteRange.parse(rangeHeader, size);
        if (range.isEmpty()) {
            return Response.status(Response.Status.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header("Content-Range", "bytes */" + size)
                    .build();
        }

        ByteRange r = range.get();
        return Response.status(Response.Status.PARTIAL_CONTENT)
                .entity(streamFile(file, r.start(), r.length()))
                .type("video/mp4")
                .header(HttpHeaders.CONTENT_LENGTH, r.length())
                .header("Accept-Ranges", "bytes")
                .header("Content-Range", "bytes " + r.start() + "-" + r.end() + "/" + size)
                .build();
    }

    @Path("/video/{id}/position")
    @POST
    @Transactional
    @Operation(
            summary = "Save where the user stopped watching the video of a feed entry",
            description = "Lets the user resume the video later, on any device")
    public Response saveVideoPosition(
            @Parameter(description = "entry id", required = true) @PathParam("id") Long id,
            @Valid @Parameter(description = "video position", required = true)
                    VideoPositionRequest req) {
        Preconditions.checkNotNull(req);

        User user = authenticationContext.getCurrentUser();
        if (!feedEntryService.saveVideoPosition(user, id, req.getPosition())) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok().build();
    }

    @Path("/video/statuses")
    @GET
    @Transactional
    @Operation(
            summary = "Get the download status of the videos of several feed entries",
            description = "Entries that are not downloadable videos are left out of the result")
    public Response getVideoStatuses(
            @Parameter(description = "entry ids", required = true) @QueryParam("id")
                    List<Long> ids) {
        Map<String, VideoDownloadStatus> statuses = new LinkedHashMap<>();
        for (Long id : ids.stream().distinct().limit(MAX_VIDEO_STATUSES).toList()) {
            findVideo(id)
                    .ifPresent(
                            video ->
                                    statuses.put(
                                            String.valueOf(id),
                                            VideoDownloadStatus.from(
                                                    videoDownloadService.status(video))));
        }
        return Response.ok(statuses).build();
    }

    @Path("/video/{id}/info")
    @GET
    @Operation(
            summary = "Get the details of the video of a feed entry",
            description = "Description, duration and chapters, read from the video site")
    public Response getVideoInfo(
            @Parameter(description = "entry id", required = true) @PathParam("id") Long id) {
        // not transactional: reading the details from the video site can take a few seconds
        Optional<VideoSource> video = unitOfWork.call(() -> findVideo(id));
        if (video.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return videoInfoService
                .info(video.get())
                .map(info -> Response.ok(VideoInfoResponse.from(info)).build())
                .orElseGet(() -> Response.noContent().build());
    }

    private static StreamingOutput streamFile(java.nio.file.Path file, long offset, long length) {
        return output -> {
            try (InputStream in = Files.newInputStream(file)) {
                in.skipNBytes(offset);
                byte[] buffer = new byte[64 * 1024];
                long remaining = length;
                while (remaining > 0) {
                    int read = in.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                    if (read == -1) {
                        break;
                    }
                    output.write(buffer, 0, read);
                    remaining -= read;
                }
            }
        };
    }

    /**
     * Returns the downloadable video of the entry, if the feature is enabled, the entry exists, the
     * current user is subscribed to its feed and its url is a YouTube or TikTok video.
     */
    private Optional<VideoSource> findVideo(Long entryId) {
        if (!videoDownloadService.isEnabled() || entryId == null) {
            return Optional.empty();
        }

        FeedEntry entry = feedEntryDAO.findById(entryId);
        if (entry == null) {
            return Optional.empty();
        }

        User user = authenticationContext.getCurrentUser();
        if (feedSubscriptionDAO.findByFeed(user, entry.getFeed()) == null) {
            return Optional.empty();
        }

        return VideoUrlParser.parse(entry.getUrl());
    }
}
