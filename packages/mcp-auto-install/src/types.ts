/**
 * 描述MCP服务器的接口
 */
export interface MCPServerInfo {
  name: string;
  repo: string;
  command: string;
  description: string;
  keywords?: string[];
  installCommands?: string[];
  commandConfig?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  readme?: string;
}

/**
 * MCP Auto Install Server配置选项
 */
export interface MCPAutoInstallOptions {
  llmApiKey?: string;
  llmApiEndpoint?: string;
  settingsPath?: string;
}

/**
 * 操作结果接口
 */
export interface OperationResult {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

/**
 * npm包信息接口
 */
export interface NpmPackageInfo {
  name: string;
  links?: {
    repository?: string;
    [key: string]: string | undefined;
  };
  original?: {
    readme?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
} 