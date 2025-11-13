import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [wallet, setWallet] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      alert("Ungültige Adresse");
      return;
    }
    navigate(`/results/${wallet}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Wallet-Analyse</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <input
          type="text"
          className="border p-2 w-full mb-3 rounded"
          placeholder="0x123..."
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full"
        >
          Analysieren (Enter)
        </button>
      </form>
    </div>
  );
}
