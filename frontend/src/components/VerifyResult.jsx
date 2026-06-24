// FIXED: VerifyResult component to check medicine status and alternatives
import { useEffect, useState } from 'react'
import api from '../api' // FIXED: use single api instance
import { saveOcrResult } from '../services/api' // FIXED: import saveOcrResult
import ResultCard from './ResultCard'

export default function VerifyResult({ medicineName, onReset }) {
  const [isLoading, setIsLoading] = useState(false); // FIXED: loading state
  const [error, setError] = useState(null); // FIXED: error state
  const [result, setResult] = useState(null); // FIXED: result state

  const lastSearchedName = medicineName; // FIXED: save last searched name for retry

  const handleVerify = async (nameToVerify) => {
    setIsLoading(true);   // FIXED: show spinner during fetch
    setError(null);
    setResult(null);

    try {
      let savedId = null;
      try {
        const savedOcr = await saveOcrResult('guest', nameToVerify);
        savedId = savedOcr?._id || savedOcr?.id;
      } catch (ocrErr) {
        console.error('Failed to save OCR feedback:', ocrErr.message);
      }

      const data = await api.get('/api/verify', { params: { name: nameToVerify } });
      setResult({ ...data.medicine, id: savedId }); // FIXED: attach OCR database record ID
    } catch (err) {
      setError(err.message); // FIXED: show error message on failure
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (medicineName) {
      handleVerify(medicineName); // FIXED: run verify on mount
    }
  }, [medicineName]);

  // In JSX:
  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p style={{ color: '#888' }}>Verifying medicine, please wait...</p>
      {/* add your spinner component here if you have one */}
    </div>
  );

  if (error) return (
    <div style={{ padding: '1rem', background: '#fdecea', borderRadius: '8px', color: '#c0392b' }}>
      <strong>Error:</strong> {error}
      <br />
      <button onClick={() => handleVerify(lastSearchedName)} style={{ marginTop: '0.75rem' }}>
        Try again
      </button>
    </div>
  );

  if (!result) return null;

  // Map result (data.medicine) to ResultCard schema
  const displayStatus = result.status === 'genuine' ? 'genuine' : (result.status === 'counterfeit' ? 'expired' : 'flagged');
  const mappedResult = {
    id: result.id, // FIXED: pass OCR record ID
    medicine: result.name,
    status: displayStatus,
    ocrText: medicineName,
    price: result.price,
    marketAverage: result.genericAlternatives?.[0]?.price || result.price,
    advice: `Medicine ${result.name} by ${result.manufacturer || 'Unknown'} is marked as ${result.status}.`,
    hindiText: result.status === 'genuine'
      ? 'यह दवा असली है। कृपया उपयोग से पहले डॉक्टर से सलाह लें।'
      : 'यह दवा संदिग्ध या नकली हो सकती है। कृपया फार्मासिस्ट से पुष्टि करें।'
  };

  return (
    <>
      <ResultCard result={mappedResult} onReset={onReset} />
      <button type="button" className="vm-rescan-btn" onClick={onReset} style={{ marginTop: '1rem' }}>
        Scan another medicine
      </button>
    </>
  );
}
