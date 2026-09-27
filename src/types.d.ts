// Los scripts de autocompletado se importan como texto plano y Bun los
// incrusta en el binario compilado.
declare module "*.txt" {
  const content: string;
  export default content;
}
