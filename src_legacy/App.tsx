import React from 'react';
import { Routes, Route } from 'react-router-dom';

import MainSidebar from '../components/MainSidebar';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import { Toaster } from '../components/Toaster';
import { ToastProvider } from '../hooks/useToast';

function App() {
  React.useEffect(() => {
    console.info('[MuseWave] App mounted, rendering UI.');
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen w-full bg-background text-foreground flex">
        <MainSidebar />
        <main className="flex-1 flex flex-col">
          <div className="bg-muted/40 text-muted-foreground px-6 py-2 text-xs">
            <strong className="text-primary mr-2">MuseWave Debug:</strong>
            UI shell mounted. If you still see only this message, check DevTools for [MuseWave] logs.
          </div>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/n8n-workflow"
              element={
                <PlaceholderPage
                  title="n8n Workflow"
                  message="Display n8n workflow JSON here."
                />
              }
            />
            <Route
              path="/replication-prompt"
              element={
                <PlaceholderPage
                  title="Replication Prompt"
                  message="This page would display the replication prompt."
                />
              }
            />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Page Not Found"
                  message="The route you visited does not exist. Try going back to the home page."
                />
              }
            />
          </Routes>
        </main>
      </div>
      <Toaster />
    </ToastProvider>
  );
}

type PlaceholderPageProps = {
  title: string;
  message: string;
};

const PlaceholderPage = ({ title, message }: PlaceholderPageProps) => {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default App;
