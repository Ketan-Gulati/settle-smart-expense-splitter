export interface BaseRepository<T, CreateInput> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(input: CreateInput): Promise<T>;
  delete(id: string): Promise<boolean>;
}
