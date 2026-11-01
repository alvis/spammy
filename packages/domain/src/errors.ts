/** thrown by scaffolded stubs until the owning feature is implemented; the server maps it to HTTP 501 */
export class NotImplementedError extends Error {
  public readonly feature: string;

  /**
   * creates an error naming the unimplemented feature
   * @param feature qualified name of the stub, e.g. `parser.parseExport`
   */
  constructor(feature: string) {
    super(`not implemented: ${feature}`);
    this.name = 'NotImplementedError';
    this.feature = feature;
  }
}
