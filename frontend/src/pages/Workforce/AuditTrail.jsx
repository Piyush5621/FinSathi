import React from 'react';
import { Card } from '../../components/ui/Card';

export default function AuditTrail() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audit Trail</h1>
      <Card className="p-6">
        <p>Enterprise-grade before/after changes will be displayed here.</p>
      </Card>
    </div>
  );
}
