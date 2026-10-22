export declare const SCRYPT_PARAMS: { N: number; r: number; p: number; keyLength: number }
export declare const MIN_PASSWORD_LENGTH: number
export declare function hashPassword(password: string): Promise<string>
export declare function verifyPassword(password: string, stored: string): Promise<boolean>
