import "@fontsource/open-sans"
import "@fontsource/space-grotesk/400.css"
import "@fontsource/space-grotesk/500.css"
import "@fontsource/space-grotesk/600.css"
import "@fontsource/space-grotesk/700.css"
import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/spotlight/styles.css"
import "react-contexify/ReactContexify.css"
import "@/theme/sand.css"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration"
import relativeTime from "dayjs/plugin/relativeTime"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { App } from "@/App"
import { store } from "@/app/store"

dayjs.extend(relativeTime)
dayjs.extend(duration)

const root = document.getElementById("root")
if (!root) throw new Error("root element not found")

ReactDOM.createRoot(root).render(
    <Provider store={store}>
        <App />
    </Provider>
)
