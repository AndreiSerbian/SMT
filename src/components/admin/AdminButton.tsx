import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AdminPanel } from './AdminPanel';
import { Settings } from 'lucide-react';

export function AdminButton() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdminPanel(true)}
        className="fixed bottom-4 right-4 z-40"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </>
  );
}