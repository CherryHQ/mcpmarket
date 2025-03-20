export type Config = {
  name: string;
  port?: number;
  options: {
    debug: boolean;
    logLevel: 'info' | 'debug' | 'error';
  };
};

export function createConfig(name: string, options?: Partial<Config['options']>): Config {
  const defaultOptions: Config['options'] = {
    debug: false,
    logLevel: 'info',
  };

  return {
    name,
    port: 3000,
    options: { ...defaultOptions, ...options },
  };
}

export const hello = () => {
  return 'Hello from @mcpmarket/test-package';
};
