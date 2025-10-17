import { createServer } from 'http';

/**
 * Find an available port starting from the given port number
 * @param startPort - The port to start checking from
 * @param maxAttempts - Maximum number of ports to check
 * @returns Promise<number> - The available port number
 */
export async function findAvailablePort(startPort: number = 3000, maxAttempts: number = 100): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Check if a specific port is available
 * @param port - The port number to check
 * @returns Promise<boolean> - True if port is available, false otherwise
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get the preferred port from environment or find an available one
 * @returns Promise<number> - The port to use
 */
export async function getServerPort(): Promise<number> {
  const preferredPort = parseInt(process.env.PORT || '3000', 10);
  
  try {
    // First try the preferred port
    if (await isPortAvailable(preferredPort)) {
      return preferredPort;
    }
    
    // If preferred port is not available, find the next available one
    console.log(`⚠️  Port ${preferredPort} is already in use, searching for available port...`);
    const availablePort = await findAvailablePort(preferredPort);
    console.log(`✅ Found available port: ${availablePort}`);
    return availablePort;
    
  } catch (error) {
    console.error('❌ Failed to find available port:', error);
    throw error;
  }
}




