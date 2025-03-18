
import { useState, useEffect } from "react";
import { DeviceType } from "@/types/feedback";

// Breakpoints for device detection
const MOBILE_MAX = 767;
const TABLET_MIN = 768;
const TABLET_MAX = 1023;
const DESKTOP_MIN = 1024;

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detectDeviceType = () => {
      const width = window.innerWidth;
      
      if (width <= MOBILE_MAX) {
        setDeviceType('mobile');
      } else if (width >= TABLET_MIN && width <= TABLET_MAX) {
        setDeviceType('tablet');
      } else if (width >= DESKTOP_MIN) {
        setDeviceType('desktop');
      } else {
        setDeviceType('custom');
      }
    };

    // Initial detection
    detectDeviceType();

    // Update on resize
    window.addEventListener('resize', detectDeviceType);
    
    // Cleanup
    return () => window.removeEventListener('resize', detectDeviceType);
  }, []);

  return deviceType;
}
