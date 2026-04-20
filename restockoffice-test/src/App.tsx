import LoginPage from './components/LoginPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoginPage
        onLogin={async (data) => {
          alert(`Login versucht: ${data.username}`);
        }}
      />
    </div>
  );
}
