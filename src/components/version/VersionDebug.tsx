import React from 'react';
import { useVersionControl } from '@/hooks/use-version-control';
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function VersionDebug({ prototypeId }: { prototypeId?: string }) {
  const { isInternalTester, versionUiEnabled, versionUploadEnabled, loading } = useVersionControl();
  const supabase = useSupabaseClient();
  const [flags, setFlags] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  
  const checkFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .in('key', ['version_control_enabled', 'version_upload_beta', 'version_ui_ro', 'version_demo_ops']);
      
      if (error) {
        throw error;
      }
      
      setFlags(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div className="border border-yellow-500 bg-yellow-50 p-4 rounded-md mb-4">
      <h3 className="font-bold text-yellow-700 mb-2">Version Control Debug</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
        <p><strong>Internal Tester:</strong> {isInternalTester ? 'Yes' : 'No'}</p>
        <p><strong>Version UI Enabled:</strong> {versionUiEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Version Upload Enabled:</strong> {versionUploadEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Prototype ID:</strong> {prototypeId || 'Not provided'}</p>
        
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkFlags}
            className="text-xs"
          >
            Check Database Flags
          </Button>
        </div>
        
        {flags.length > 0 && (
          <div className="mt-2">
            <h4 className="font-semibold text-yellow-700">Database Flags:</h4>
            <ul className="list-disc list-inside">
              {flags.map(flag => (
                <li key={flag.key}>
                  {flag.key}: {flag.enabled ? 'Enabled' : 'Disabled'}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 mt-2">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
