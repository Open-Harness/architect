const SHAPE = /^[A-Z][A-Z0-9_]{0,63}$/;
const CREDENTIAL = /TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|AUTH/;

export const wellFormed = (name: string): boolean => SHAPE.test(name);
export const credentialLike = (name: string): boolean => CREDENTIAL.test(name);
