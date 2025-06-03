
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDropzone } from "react-dropzone";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { FeedbackDeviceFilter } from "@/components/feedback/FeedbackDeviceFilter";
import { DeviceInfo } from "@/types/feedback";
import { 
  Eye, 
  Code, 
  MessageSquare, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw,
  Share2,
  Figma,
  ThumbsUp,
  ArrowLeft,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Settings,
  Download,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate, useLocation } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Device preview types
type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';
type Orientation = 'portrait' | 'landscape';

// Device configuration interface
interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

interface PreviewControlsProps {
  onViewModeChange: (mode: 'preview' | 'code' | 'split' | 'design') => void;
  viewMode: 'preview' | 'code' | 'split' | 'design';
  isFeedbackMode: boolean;
  onToggleFeedbackMode: () => void;
  showUI?: boolean;
  onToggleUI?: () => void;
  // Enhanced device preview props
  deviceType?: DeviceType;
  orientation?: Orientation;
  onDeviceChange?: (device: DeviceType) => void;
  onOrientationChange?: () => void;
  // New props for enhanced functionality
  scale?: number;
  onScaleChange?: (scale: number) => void;
  selectedDevice?: string;
  onDeviceSelection?: (deviceId: string) => void;
  deviceConfigs?: Record<string, DeviceConfig>;
  // Refresh and share buttons
  onRefresh?: () => void;
  onShare?: () => void;
  // Figma design availability
  hasFigmaDesign?: boolean;
  // New props for download and share
  filesUrl?: string;
  onDownload?: () => void;
  // Feedback device filter props
  selectedDeviceType?: DeviceType | 'all';
  onSelectDeviceType?: (deviceType: DeviceType | 'all') => void;
  deviceCounts?: Record<DeviceType | 'all', number>;
  currentDevice?: DeviceInfo;
  // Version control props
  prototypeId?: string;
  onVersionChange?: (versionId: string, previewUrl: string, version: any) => void;
  currentVersionId?: string;
}

export function PreviewControls({
  onViewModeChange,
  viewMode,
  isFeedbackMode,
  onToggleFeedbackMode,
  showUI = true,
  onToggleUI,
  // Device preview props with defaults
  deviceType = 'desktop',
  orientation = 'portrait',
  onDeviceChange,
  onOrientationChange,
  // New props with defaults
  scale = 1,
  onScaleChange,
  selectedDevice = '',
  onDeviceSelection,
  deviceConfigs = {},
  // Refresh and share buttons
  onRefresh,
  onShare,
  // Figma design availability
  hasFigmaDesign = false,
  filesUrl,
  onDownload,
  // Feedback device filter props
  selectedDeviceType = 'all',
  onSelectDeviceType,
  deviceCounts = { all: 0, desktop: 0, tablet: 0, mobile: 0, custom: 0 },
  currentDevice = { type: 'desktop', width: 1920, height: 1080, orientation: 'portrait', scale: 1 },
  // Version control props
  prototypeId,
  onVersionChange,
  currentVersionId,
}: PreviewControlsProps) {
  const { toast } = useToast();
  const [showVersionUploadModal, setShowVersionUploadModal] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [versionName, setVersionName] = useState("Version 1.2");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [uploadStep, setUploadStep] = useState<string>("");
  const [fileValidationStatus, setFileValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [fileValidationMessage, setFileValidationMessage] = useState<string>("");
  const supabaseClient = useSupabaseClient();
  
  // Validate ZIP file
  const validateZipFile = async (file: File): Promise<boolean> => {
    setFileValidationStatus('validating');
    setFileValidationMessage("Validating ZIP archive...");
    
    try {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setFileValidationStatus('invalid');
        setFileValidationMessage("File must be a ZIP archive.");
        return false;
      }
      
      // Check file size (20MB limit)
      const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
      if (file.size > maxFileSize) {
        setFileValidationStatus('invalid');
        setFileValidationMessage("File size must be less than 20MB.");
        return false;
      }
      
      // Import JSZip dynamically if needed
      // const JSZip = (await import('jszip')).default;
      // const zip = new JSZip();
      // const contents = await zip.loadAsync(file);
      
      // For now, we'll just trust the file extension
      setFileValidationStatus('valid');
      setFileValidationMessage("ZIP file looks valid.");
      return true;
    } catch (error) {
      console.error("ZIP validation error:", error);
      setFileValidationStatus('invalid');
      setFileValidationMessage("Error validating ZIP file.");
      return false;
    }
  };
  
  // Handle file upload for version
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    console.log('Drop event:', { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type 
    });

    // Check for all required fields
    if (!versionName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a version name',
        variant: 'destructive',
      });
      return;
    }
    
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    if (!prototypeId) {
      toast({
        title: 'Error',
        description: 'Missing prototype ID',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate the file
    const isValid = await validateZipFile(file);
    if (!isValid) return;
    
    setIsUploading(true);
    setUploadStep("Preparing upload...");
    
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Add optional metadata
      if (versionName) formData.append('title', versionName);
      if (figmaUrl) formData.append('figma_url', figmaUrl);
      
      setUploadStep("Authenticating...");
      // Get authenticated user's JWT token
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in');
      }
      
      setUploadStep("Uploading file...");
      // Call the version upload API endpoint
      const response = await fetch(`/api/version-upload/${prototypeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload version');
      }
      
      const versionData = await response.json();
      
      toast({
        title: 'Version upload started',
        description: `Version ${versionData.version_number} is now processing.`,
      });
      
      console.log('Version upload successful, new version data:', versionData);
      
      // Reset the form
      setVersionName("");
      setFigmaUrl("");
      setFileValidationStatus('idle');
      setFileValidationMessage("");
      setShowVersionUploadModal(false);
      
      // Force refresh the versions list immediately
      fetchVersions();
      
      // Poll for the new version to be ready
      const pollForVersion = async (attempts = 0, maxAttempts = 10) => {
        if (attempts >= maxAttempts) return;
        
        try {
          const { data, error } = await supabaseClient
            .from('prototype_versions')
            .select('*')
            .eq('prototype_id', prototypeId)
            .eq('status', 'ready')
            .order('version_number', { ascending: false });
            
          if (data && data.length > 0) {
            setVersions(data);
            const newVersion = data.find(v => v.id === versionData.id && v.status === 'ready');
            
            if (newVersion) {
              setCurrentVersion(newVersion);
              onVersionChange?.(newVersion.id, newVersion.preview_url, newVersion);
              toast({
                title: 'New version ready!',
                description: `Switched to v${newVersion.version_number}`
              });
              return;
            }
          }
          
          // Continue polling
          setTimeout(() => pollForVersion(attempts + 1, maxAttempts), 2000);
        } catch (err) {
          console.error('Error polling for version:', err);
          setTimeout(() => pollForVersion(attempts + 1, maxAttempts), 2000);
        }
      };
      
      // Start polling after 3 seconds
      setTimeout(() => pollForVersion(), 3000);
      
    } catch (error: any) {
      console.error('Error uploading version:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading the version',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setUploadStep("");
    }
  };
  
  // Initialize dropzone for version uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB size limit
    disabled: isUploading
  });
  
  // Reset form state when modal opens/closes
  useEffect(() => {
    if (!showVersionUploadModal) {
      setVersionName("");
      setFigmaUrl("");
      setFileValidationStatus('idle');
      setFileValidationMessage("");
    }
  }, [showVersionUploadModal]);
  
  // Function to fetch versions for the prototype
  const fetchVersions = async () => {
    if (!prototypeId) {
      console.log('No prototype ID provided, skipping version fetch');
      return;
    }
    
    try {
      console.log('Fetching versions for prototype ID:', prototypeId);
      const { data, error } = await supabaseClient
        .from('prototype_versions')
        .select('*')
        .eq('prototype_id', prototypeId)
        .order('version_number', { ascending: false });
        
      console.log('Versions data:', data, 'Error:', error);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Filter only ready versions for display
        const readyVersions = data.filter(v => v.status === 'ready');
        console.log('Ready versions:', readyVersions);
        
        // But also keep non-ready versions in console for debugging
        const processingVersions = data.filter(v => v.status === 'processing');
        if (processingVersions.length > 0) {
          console.log('Processing versions:', processingVersions);
        }
        
        setVersions(readyVersions);
        
        if (readyVersions.length > 0) {
          if (!currentVersionId) {
            // Select latest version by default
            setCurrentVersion(readyVersions[0]);
            onVersionChange?.(readyVersions[0].id, readyVersions[0].preview_url, readyVersions[0]);
          } else {
            // Select current version if specified
            const current = readyVersions.find(v => v.id === currentVersionId);
            if (current) {
              setCurrentVersion(current);
            } else {
              // Fallback to latest if specified version not found
              setCurrentVersion(readyVersions[0]);
              onVersionChange?.(readyVersions[0].id, readyVersions[0].preview_url, readyVersions[0]);
            }
          }
        }
      } else {
        console.log('No versions found for prototype');
        setVersions([]);
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
    }
  };
  
  // Fetch versions on mount and when prototype ID changes
  useEffect(() => {
    console.log('Current prototype ID:', prototypeId);
    fetchVersions();
  }, [prototypeId, currentVersionId]);
  
  // Handle version change
  const handleVersionChange = (version: any) => {
    setCurrentVersion(version);
    onVersionChange?.(version.id, version.preview_url, version);
    toast({
      title: `Switched to v${version.version_number}`,
      description: version.title || `Created ${new Date(version.created_at).toLocaleDateString()}`
    });
  };
  
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showScaleControls, setShowScaleControls] = useState(false);
  const [backAttempts, setBackAttempts] = useState(0);

  // Group devices by category for the dropdown menu
  const mobileDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id.includes('iphone') || id.includes('pixel') || id.includes('galaxy-s')
  );
  
  const tabletDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id.includes('ipad') || id.includes('galaxy-tab')
  );
  
  const desktopDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id === 'laptop' || id === 'desktop'
  );

  // Get the current device name
  const getCurrentDeviceName = () => {
    if (deviceType === 'desktop' && !selectedDevice) {
      return 'Responsive';
    }
    
    if (selectedDevice && deviceConfigs[selectedDevice]) {
      return deviceConfigs[selectedDevice].name;
    }
    
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  };

  // Enhanced back button handling with debug logging
  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pathParts = location.pathname.split('/');
    const isInPrototypeDetail = pathParts[1] === 'prototype';
    
    console.log('Back button clicked. Current location:', location.pathname);
    console.log('History state:', history.state);
    console.log('Window history length:', window.history.length);
    
    // If we're on a prototype detail page, always navigate to dashboard
    if (isInPrototypeDetail) {
      console.log('In prototype detail view, navigating to dashboard');
      navigate('/dashboard');
      return;
    }
    
    // Try going back in history
    if (window.history.length > 1) {
      console.log('Going back in history');
      navigate(-1);
      
      // Increment back attempts to track potential issues
      setBackAttempts(prev => prev + 1);
      
      // If we've tried multiple times and are still on the same page,
      // fallback to dashboard (safety measure)
      if (backAttempts > 1) {
        // Reset the counter and navigate to dashboard
        setBackAttempts(0);
        setTimeout(() => {
          if (location.pathname === window.location.pathname) {
            console.log('Multiple back attempts with no change, falling back to dashboard');
            navigate('/dashboard');
          }
        }, 100);
      }
    } else {
      // No history, go straight to dashboard
      console.log('No history found, navigating to dashboard');
      navigate('/dashboard');
    }
  };

  // Reset back attempts counter when location changes
  useEffect(() => {
    setBackAttempts(0);
  }, [location.pathname]);

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg backdrop-blur-sm bg-background/80 shadow-md">
      {/* Back button with improved handling */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleBackClick}
        title="Back to dashboard"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      
      {/* View mode toggle */}
      <Tabs 
        value={viewMode} 
        onValueChange={(value) => onViewModeChange(value as 'preview' | 'code' | 'split' | 'design')}
        className="w-auto"
      >
        <TabsList className="h-8">
          <TabsTrigger value="preview" className="flex items-center gap-1 px-2 h-7">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-1 px-2 h-7">
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          {hasFigmaDesign && (
            <TabsTrigger value="design" className="flex items-center gap-1 px-2 h-7">
              <Figma className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Device type and selection dropdown - only show in preview mode */}
      {viewMode === 'preview' && onDeviceChange && onDeviceSelection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex items-center gap-1 px-2"
              title="Change device type"
            >
              {deviceType === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
              {deviceType === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
              {deviceType === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-xs">{getCurrentDeviceName()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Device Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Desktop option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('desktop')}
              className={deviceType === 'desktop' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Responsive
            </DropdownMenuItem>
            
            {/* Desktop presets submenu */}
            {desktopDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop Presets
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {desktopDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Tablet option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('tablet')}
              className={deviceType === 'tablet' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Tablet className="h-4 w-4 mr-2" />
              Generic Tablet
            </DropdownMenuItem>
            
            {/* Tablet devices submenu */}
            {tabletDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tablet className="h-4 w-4 mr-2" />
                  Tablet Devices
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {tabletDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Mobile option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('mobile')}
              className={deviceType === 'mobile' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Generic Mobile
            </DropdownMenuItem>
            
            {/* Mobile devices submenu */}
            {mobileDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Devices
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {mobileDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Custom device option */}
            <DropdownMenuItem onClick={() => onDeviceChange('custom')}>
              <Settings className="h-4 w-4 mr-2" />
              Custom Dimensions...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Orientation toggle - only show for tablet and mobile in preview mode */}
      {viewMode === 'preview' && onOrientationChange && deviceType !== 'desktop' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onOrientationChange}
          title={`Switch to ${orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      
      {/* Scale controls - only show in preview mode for non-desktop devices */}
      {viewMode === 'preview' && onScaleChange && deviceType !== 'desktop' && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowScaleControls(!showScaleControls)}
            title="Adjust scale"
          >
            {scale >= 1 ? (
              <ZoomIn className="h-3.5 w-3.5" />
            ) : (
              <ZoomOut className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {showScaleControls && (
            <div className="absolute top-full mt-2 right-0 bg-background border rounded-md shadow-md p-3 z-50 w-48">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs">Scale: {Math.round(scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => onScaleChange(1)}
                >
                  Reset
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onScaleChange(Math.max(0.25, scale - 0.1))}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Slider
                  value={[scale]}
                  min={0.25}
                  max={2}
                  step={0.05}
                  onValueChange={(value) => onScaleChange(value[0])}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onScaleChange(Math.min(2, scale + 0.1))}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback mode toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="feedback-mode"
          checked={isFeedbackMode}
          onCheckedChange={onToggleFeedbackMode}
        />
        <Label htmlFor="feedback-mode" className="text-xs cursor-pointer">
          Feedback Mode
        </Label>
      </div>

      {/* Refresh button */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Feedback Device Filter - Only show in feedback mode */}
      {isFeedbackMode && onSelectDeviceType && (
        <div className="flex-shrink-0 mx-2">
          <FeedbackDeviceFilter
            selectedDeviceType={selectedDeviceType || 'all'}
            onSelectDeviceType={onSelectDeviceType}
            deviceCounts={deviceCounts}
            currentDevice={currentDevice}
            deviceType={deviceType}
            selectedDevice={selectedDevice}
            onDeviceChange={onDeviceChange}
            onDeviceSelection={onDeviceSelection}
            deviceConfigs={deviceConfigs}
            onOrientationChange={onOrientationChange}
            orientation={orientation}
          />
        </div>
      )}

      <div className="flex-1" /> {/* Spacer */}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Version control dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex items-center gap-1 px-2"
            >
              {currentVersion ? `v${currentVersion.version_number}` : 'Version'}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Versions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {versions.length === 0 ? (
              // Show placeholder versions for testing when no real versions are available
              <>
                <DropdownMenuItem 
                  onClick={() => {
                    const placeholderVersion = {
                      id: 'placeholder-1',
                      version_number: 1.0,
                      title: 'Initial Release',
                      created_at: new Date().toISOString(),
                      preview_url: '',
                      status: 'ready'
                    };
                    handleVersionChange(placeholderVersion);
                  }}
                >
                  v1.0 - Initial Release
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const placeholderVersion = {
                      id: 'placeholder-2',
                      version_number: 1.2,
                      title: 'Version 1.2',
                      created_at: new Date().toISOString(),
                      preview_url: '',
                      status: 'ready'
                    };
                    handleVersionChange(placeholderVersion);
                  }}
                >
                  v1.2 - Updated Animations
                </DropdownMenuItem>
              </>
            ) : (
              versions.map(version => (
                <DropdownMenuItem 
                  key={version.id}
                  onClick={() => handleVersionChange(version)}
                  className={currentVersion?.id === version.id ? 'bg-accent' : ''}
                >
                  v{version.version_number} - {version.title || new Date(version.created_at).toLocaleDateString()}
                </DropdownMenuItem>
              ))
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              console.log('Add Version clicked, prototype ID:', prototypeId);
              setShowVersionUploadModal(true);
            }}>
              <Plus className="h-4 w-4 mr-2 font-bold" />
              Add Version
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Download button */}
        {filesUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDownload}
            title="Download Files"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Share button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onShare}
          title="Share Prototype"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hide/Unhide UI button */}
      {onToggleUI && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleUI}
          title={showUI ? "Hide UI" : "Show UI"}
        >
          {showUI ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
      
      {/* Version Upload dialog */}
      {showVersionUploadModal && (
        <Dialog open={showVersionUploadModal} onOpenChange={setShowVersionUploadModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Version</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-2">
              {/* Version name input */}
              <div>
                <Input
                  id="version-name"
                  placeholder="Version 1.2"
                  value={versionName}
                  onChange={(e) => {
                    console.log('Version name changed:', e.target.value);
                    setVersionName(e.target.value);
                  }}
                  autoComplete="off"
                />
              </div>
              
              {/* Figma URL input */}
              <div>
                <Input
                  id="figma-url"
                  placeholder="Figma Design URL (optional)"
                  value={figmaUrl}
                  onChange={(e) => {
                    console.log('Figma URL changed:', e.target.value);
                    setFigmaUrl(e.target.value);
                  }}
                  autoComplete="off"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Link your Figma design to view it alongside your prototype
                </div>
              </div>
              
              {/* File upload area */}
              <div className="flex flex-col items-center">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-10 w-full ${isDragActive ? 'border-primary bg-secondary/20' : 'border-muted'} flex flex-col items-center justify-center text-center cursor-pointer transition-colors`}
                >
                  <input {...getInputProps()} />
                  <p className="text-sm font-medium mb-1">Drag 'n' drop a file here, or click to select</p>
                  <p className="text-xs text-muted-foreground">
                    Supports ZIP archives containing web content (max 20MB)
                  </p>
                </div>
                
                {/* File validation status */}
                {fileValidationStatus === 'validating' && (
                  <div className="mt-3 flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {fileValidationMessage}
                  </div>
                )}
                
                {fileValidationStatus === 'valid' && (
                  <div className="mt-3 flex items-center text-sm text-green-500">
                    <Check className="h-4 w-4 mr-2" />
                    {fileValidationMessage}
                  </div>
                )}
                
                {fileValidationStatus === 'invalid' && (
                  <div className="mt-3 flex items-center text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {fileValidationMessage}
                  </div>
                )}
                
                {/* Upload status */}
                {isUploading && (
                  <div className="mt-3 flex flex-col items-center">
                    <Loader2 className="h-4 w-4 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">{uploadStep}</p>
                  </div>
                )}
              </div>
              
              {/* We've removed the debug info */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
