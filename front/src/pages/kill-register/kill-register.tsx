import { useEffect, useRef, useState } from 'react';
import './kill-register.css';
import Button from '../../components/button/button';
import type { Person } from '../../types/person';
const BACKEND = import.meta.env.VITE_FRONT_BACKEND;
export default function KillRegister() {
  const [formData, setFormData] = useState<Person>({
    fullName: '',
    cause: '',
    details: '',
    photo: null,
  });

  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const causeStartRef = useRef<number | null>(null);
  const detailsStartRef = useRef<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement|any>
  ) => {
    const { name, value, files } = e.target;

    if (name === 'cause' && !causeStartRef.current) {
      causeStartRef.current = Date.now();
    }

    if (name === 'details' && !detailsStartRef.current) {
      detailsStartRef.current = Date.now();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));

    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('handleSubmit');
    
    e.preventDefault();

    setSubmitDisabled(true);

    // Validaciones obligatorias
    if (!formData.fullName.trim()) {
      setErrorMessage("El nombre completo es obligatorio.");
      setSubmitDisabled(false);
      return;
    }

    if (!formData.photo) {
      setErrorMessage("Debes subir una foto del rostro.");
      setSubmitDisabled(false);
      return;
    }

    // Validar causa si fue escrita
    if (formData.cause?.trim()) {
      const causeElapsed = causeStartRef.current
        ? (Date.now() - causeStartRef.current) / 1000
        : 999;
      if (causeElapsed > 40) {
        setErrorMessage("La causa se escribió después del límite de 40 segundos.");
        setSubmitDisabled(false);
        return;
      }
    }

    // Validar detalles si fue escrito
    if (formData.details?.trim()) {
      const detailsElapsed = detailsStartRef.current
        ? (Date.now() - detailsStartRef.current) / 1000
        : 999;
      if (detailsElapsed > 400) {
        setErrorMessage("Los detalles se escribieron después del límite de 6:40 minutos.");
        setSubmitDisabled(false);
        return;
      }
    }

    // Crear FormData
    const data = new FormData();
    data.append('fullName', formData.fullName);
    data.append('cause', formData.cause || '');
    data.append('details', formData.details || '');
    data.append('photo', formData.photo);

    try {
      const res = await fetch(`${BACKEND}/death`, {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error('Error al registrar muerte');

      setFormData({ fullName: '', cause: '', details: '', photo: null });
      causeStartRef.current = null;
      detailsStartRef.current = null;
      setErrorMessage("✅ Muerte registrada con éxito.");
    } catch (error) {
      setErrorMessage("Ocurrió un error al registrar la muerte.");
      console.error(error);
    } finally {
      setSubmitDisabled(false);
    }
  };

  return (
    <div className="deathnote-form-container">
      <h1>Registrar en la Death Note</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre completo:
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Causa de muerte (opcional — tienes hasta 40 segundos para escribirla):
          <input
            type="text"
            name="cause"
            value={formData.cause}
            onChange={handleChange}
          />
        </label>

        <label>
          Detalles (opcional — tienes hasta 6:40 minutos para escribirlos):
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            placeholder="Puedes dejar este campo vacío..."
          />
        </label>

        <label>
          Foto del rostro:
          <input
            type="file"
            accept="image/*"
            name="photo"
            onChange={handleChange}
            required
          />
        </label>

        {errorMessage && (
          <p className="deathnote-error-message">{errorMessage}</p>
        )}

  <Button
  type="submit"
  className="deathnote-form-button"
  label="Ejecutar muerte"
  size="small"
  variant="primary"
  disabled={submitDisabled}
/>

      </form>
    </div>
  );
}
