//import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CreateBusiness from './pages/Createbusiness';
import QueueBoard from './pages/Queueboard';
import JoinQueue from './pages/JoinQueue';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login onCreateBusiness={() => window.location.assign('/create-business')} />} />
        <Route path="/create-business" element={<CreateBusiness onCancel={() => window.location.assign('/login')} />} />
        <Route path="/dashboard/:queueId" element={<QueueBoard />} />
        <Route path="/joinQueue" element={<JoinQueue />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
