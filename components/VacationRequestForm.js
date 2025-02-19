import { useState } from 'react';

export default function VacationRequestForm({ 
  initialDate,
  employeeName,
  onSubmit,
  onClose 
}) {
  const [formData, setFormData] = useState({
    date: initialDate || '',
    employeeName: employeeName || '',
    type: '公休', // デフォルト値
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setMessage(error.message || 'エラーが発生しました');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">休暇申請</h2>
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-3xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">日付:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">社員名:</label>
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              readOnly
            />
          </div>

          <div>
            <label className="block mb-1">種別:</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="公休">公休</option>
              <option value="有休">有休</option>
            </select>
          </div>

          <div className="flex gap-4 mt-6">
            <button 
              type="submit"
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 
                transition-all duration-200 active:scale-95"
            >
              申請
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 
                transition-all duration-200 active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </form>
        
        {message && (
          <p className="mt-4 text-center text-red-600">{message}</p>
        )}
      </div>
    </div>
  );
}
