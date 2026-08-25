import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VictimCard from "../../components/list-card/dn-card";
import "./dn-list.css";
import type { Kill } from "../../types/Kill";
const BACKEND = import.meta.env.VITE_FRONT_BACKEND;

export default function VictimList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [victims, setVictims] = useState<Kill[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const victimsPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [selectedVictim, setSelectedVictim] = useState<Kill | null>(null);
const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchVictims = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${BACKEND}/death`);
        if (!res.ok) throw new Error("Error al cargar víctimas");
        const data = await res.json();
        setVictims(data);
        setError(null);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVictims();
  }, []);

  const filteredVictims = victims.filter(v =>
    v.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVictims.length / victimsPerPage);
  const indexStart = (currentPage - 1) * victimsPerPage;
  const currentVictims = filteredVictims.slice(indexStart, indexStart + victimsPerPage);

const handleCardClick = async (id: number) => {
  try {
    const res = await fetch(`${BACKEND}/death/${id}`);
    if (!res.ok) throw new Error("No se pudo cargar la víctima");
    const victim = await res.json();
     setSelectedVictim(victim);
    setShowModal(true);
  } catch (error) {
    console.error(error);
  }
};
  if (showModal && selectedVictim) {
    return (
      <div className="dn-modal-backdrop" onClick={() => setShowModal(false)}>
        <div className="dn-modal" onClick={(e) => e.stopPropagation()}>
          <button className="dn-modal-close" onClick={() => setShowModal(false)}>✖</button>
          <h2>{selectedVictim.fullName}</h2>
          <img
            src={`${BACKEND}/${selectedVictim.faceImageUrl}`}
            alt="Foto de la víctima"
            className="dn-modal-photo"
          />
          {selectedVictim.causeOfDeath && <p><strong>Causa:</strong> {selectedVictim.causeOfDeath}</p>}
          {selectedVictim.details && <p><strong>Detalles:</strong> {selectedVictim.details}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="dn-list-page">
      <h1 className="dn-list-title">Cuaderno de la Muerte</h1>

      <div className="dn-list-controls">
        <input
          type="text"
          placeholder="Buscar víctima por nombre..."
          className="dn-list-search"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // reset page when search
          }}
        />
      </div>

      {isLoading ? (
        <p className="dn-list-message">Consultando al Shinigami...</p>
      ) : error ? (
        <p className="dn-list-error">{error}</p>
      ) : (
        <>
          <div className="dn-list-grid">
            {currentVictims.map((kill) => (
              <div key={kill.id} onClick={() => handleCardClick(kill.id)}>
                <VictimCard kill={kill} />
              </div>
            ))}
          </div>

          <div className="dn-list-nav">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ⬅ Anterior
            </button>
            <span style={{ color: "crimson", alignSelf: "center" }}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente ➡
            </button>
          </div>
        </>
      )}
      
    </div>
    
  );
  
}
