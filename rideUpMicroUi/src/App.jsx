import AppRouter from "./routes/AppRouter";
import { ChatSocketProvider } from "./context/ChatSocketContext";

function App() {
  return (
    <ChatSocketProvider>
      <AppRouter />
    </ChatSocketProvider>
  );
}

export default App;
