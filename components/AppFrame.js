export default function AppFrame({ children }) {
  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-7xl">{children}</div>
    </div>
  );
}
