/**
 * 文档处理工具函数
 * 提供文档格式验证、内容处理、文件名生成等实用功能
 */

/**
 * 文档类型枚举
 */
export enum DocumentType {
  MARKDOWN = 'markdown',
  TEXT = 'text',
  JSON = 'json',
  UNKNOWN = 'unknown'
}

/**
 * 文档元数据接口
 */
export interface DocumentMetadata {
  type: DocumentType;
  size: number;
  title: string;
  preview: string;
  wordCount: number;
  lineCount: number;
  createdAt: string;
}

/**
 * 检测文档类型
 * 
 * @param content - 文档内容
 * @param fileName - 文件名（可选）
 * @returns 文档类型
 */
export const detectDocumentType = (content: string, fileName?: string): DocumentType => {
  // 通过文件扩展名检测
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'md':
      case 'markdown':
        return DocumentType.MARKDOWN;
      case 'txt':
        return DocumentType.TEXT;
      case 'json':
        return DocumentType.JSON;
    }
  }

  // 通过内容检测
  const trimmedContent = content.trim();
  
  // JSON 检测
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    try {
      JSON.parse(trimmedContent);
      return DocumentType.JSON;
    } catch {
      // 不是有效的 JSON
    }
  }

  // Markdown 检测
  const markdownPatterns = [
    /^#+ /m,           // 标题
    /\*\*.+\*\*/,      // 粗体
    /\*.+\*/,          // 斜体
    /\[.+\]\(.+\)/,    // 链接
    /```[\s\S]*```/,   // 代码块
    /^> /m,            // 引用
    /^- /m,            // 列表
    /^\d+\. /m         // 数字列表
  ];

  const hasMarkdown = markdownPatterns.some(pattern => pattern.test(content));
  if (hasMarkdown) {
    return DocumentType.MARKDOWN;
  }

  return DocumentType.TEXT;
};

/**
 * 生成文档预览
 * 
 * @param content - 文档内容
 * @param maxLength - 最大长度
 * @returns 预览文本
 */
export const generatePreview = (content: string, maxLength: number = 100): string => {
  const trimmed = content.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // 尝试在单词边界截断
  const truncated = trimmed.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
};

/**
 * 从内容中提取标题
 * 
 * @param content - 文档内容
 * @param type - 文档类型
 * @returns 提取的标题
 */
export const extractTitle = (content: string, type: DocumentType): string => {
  const lines = content.trim().split('\n');
  
  switch (type) {
    case DocumentType.MARKDOWN:
      // 查找第一个 # 标题
      for (const line of lines) {
        const match = line.match(/^#+\s+(.+)$/);
        if (match) {
          return match[1].trim();
        }
      }
      break;
      
    case DocumentType.JSON:
      try {
        const json = JSON.parse(content);
        if (json.title) return json.title;
        if (json.name) return json.name;
      } catch {
        // 忽略解析错误
      }
      break;
  }

  // 如果没有找到标题，使用第一行
  const firstLine = lines[0]?.trim();
  if (firstLine) {
    return generatePreview(firstLine, 50);
  }

  return 'Untitled Document';
};

/**
 * 生成文档元数据
 * 
 * @param content - 文档内容
 * @param fileName - 文件名（可选）
 * @returns 文档元数据
 */
export const generateDocumentMetadata = (
  content: string, 
  fileName?: string
): DocumentMetadata => {
  const type = detectDocumentType(content, fileName);
  const title = extractTitle(content, type);
  const preview = generatePreview(content);
  const wordCount = content.trim().split(/\s+/).length;
  const lineCount = content.split('\n').length;
  
  return {
    type,
    size: new Blob([content]).size,
    title,
    preview,
    wordCount,
    lineCount,
    createdAt: new Date().toISOString()
  };
};

/**
 * 生成建议的文件名
 * 
 * @param content - 文档内容
 * @param type - 文档类型（可选）
 * @returns 建议的文件名
 */
export const generateFileName = (content: string, type?: DocumentType): string => {
  const docType = type || detectDocumentType(content);
  const title = extractTitle(content, docType);
  
  // 清理标题，移除非法字符
  const cleanTitle = title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  // 截断过长的文件名
  const maxLength = 50;
  const truncatedTitle = cleanTitle.length > maxLength 
    ? cleanTitle.substring(0, maxLength).replace(/-[^-]*$/, '')
    : cleanTitle;

  // 添加适当的扩展名
  switch (docType) {
    case DocumentType.MARKDOWN:
      return `${truncatedTitle || 'document'}.md`;
    case DocumentType.JSON:
      return `${truncatedTitle || 'data'}.json`;
    default:
      return `${truncatedTitle || 'document'}.txt`;
  }
};

/**
 * 验证文档内容
 * 
 * @param content - 文档内容
 * @returns 验证结果
 */
export const validateDocumentContent = (content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本验证
  if (!content) {
    errors.push('Document content cannot be empty');
  }

  if (content.trim().length === 0) {
    errors.push('Document cannot contain only whitespace');
  }

  // 大小检查
  const sizeInMB = new Blob([content]).size / (1024 * 1024);
  if (sizeInMB > 10) {
    warnings.push('Document is larger than 10MB, which may affect performance');
  }

  // 行数检查
  const lineCount = content.split('\n').length;
  if (lineCount > 10000) {
    warnings.push('Document has more than 10,000 lines, which may affect performance');
  }

  // 字符检查
  const invalidChars = content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
  if (invalidChars) {
    warnings.push('Document contains control characters that may cause issues');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 格式化文件大小
 * 
 * @param bytes - 字节数
 * @returns 格式化的大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化日期时间
 * 
 * @param dateString - ISO 日期字符串
 * @returns 格式化的日期时间
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 小于 1 分钟
  if (diffInSeconds < 60) {
    return 'just now';
  }

  // 小于 1 小时
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // 小于 1 天
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // 小于 1 周
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // 超过 1 周，显示具体日期
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 生成唯一的文档 ID
 * 
 * @returns 唯一 ID
 */
export const generateDocumentId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * 压缩文本内容（移除多余空白）
 * 
 * @param content - 要压缩的内容
 * @returns 压缩后的内容
 */
export const compressContent = (content: string): string => {
  return content
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\n{3,}/g, '\n\n')  // 移除多余的空行
    .replace(/[ \t]+$/gm, '')  // 移除行尾空白
    .trim();
}; 