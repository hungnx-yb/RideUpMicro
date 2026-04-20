import AppRouter from "./routes/AppRouter";
import { ChatSocketProvider } from "./context/ChatSocketContext";
import { NotificationSocketProvider } from "./context/NotificationSocketContext";

function App() {
  return (
    <ChatSocketProvider>
      <NotificationSocketProvider>
        <AppRouter />
      </NotificationSocketProvider>
    </ChatSocketProvider>
  );
}

export default App;
