import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { UpdateTokenCollectionInput, ISourceMetadata } from '@/types/collection.types';
import type { ITheme } from '@/types/theme.types';
import type { TokenGroup } from '@/types/token.types';
import type { CollectionDoc, CreateCollectionInput, ICollectionRepository } from './repository';

function toDoc(raw: Record<string, unknown>): CollectionDoc {
  return {
    _id: String(raw._id),
    name: raw.name as string,
    tokens: (raw.tokens as Record<string, unknown>) ?? {},
    sourceMetadata: (raw.sourceMetadata as CollectionDoc['sourceMetadata']) ?? null,
    userId: (raw.userId as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    tags: (raw.tags as string[]) ?? [],
    figmaToken: (raw.figmaToken as string | null) ?? null,
    figmaFileId: (raw.figmaFileId as string | null) ?? null,
    githubRepo: (raw.githubRepo as string | null) ?? null,
    githubBranch: (raw.githubBranch as string | null) ?? null,
    graphState: (raw.graphState as CollectionDoc['graphState']) ?? null,
    themes: ((raw.themes as Array<Record<string, unknown>>) ?? []).map((t) => ({
      ...t,
      tokens: (t.tokens as TokenGroup[]) ?? [],
    })) as ITheme[],
    createdAt: (raw.createdAt as Date).toISOString(),
    updatedAt: (raw.updatedAt as Date).toISOString(),
  };
}

export class MongoCollectionRepository implements ICollectionRepository {
  private async connect() {
    await dbConnect();
  }

  async list(): Promise<CollectionDoc[]> {
    await this.connect();
    const docs = await TokenCollection.find({}).sort({ updatedAt: -1 }).lean();
    return docs.map((d) => toDoc(d as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<CollectionDoc | null> {
    await this.connect();
    const doc = await TokenCollection.findById(id).lean();
    return doc ? toDoc(doc as unknown as Record<string, unknown>) : null;
  }

  async findByName(name: string): Promise<CollectionDoc | null> {
    await this.connect();
    const doc = await TokenCollection.findOne({ name }).lean();
    return doc ? toDoc(doc as unknown as Record<string, unknown>) : null;
  }

  async create(data: CreateCollectionInput): Promise<CollectionDoc> {
    await this.connect();
    const doc = await TokenCollection.create({
      name: data.name,
      tokens: data.tokens ?? {},
      sourceMetadata: data.sourceMetadata ?? null,
      userId: data.userId ?? null,
      description: data.description ?? null,
      tags: data.tags ?? [],
      figmaToken: data.figmaToken ?? null,
      figmaFileId: data.figmaFileId ?? null,
      githubRepo: data.githubRepo ?? null,
      githubBranch: data.githubBranch ?? null,
    });
    return toDoc(doc.toObject() as Record<string, unknown>);
  }

  async update(id: string, data: UpdateTokenCollectionInput): Promise<CollectionDoc | null> {
    await this.connect();
    const doc = await TokenCollection.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    return doc ? toDoc(doc as unknown as Record<string, unknown>) : null;
  }

  async delete(id: string): Promise<boolean> {
    await this.connect();
    const doc = await TokenCollection.findByIdAndDelete(id).lean();
    return doc !== null;
  }

  async updateSourceMetadata(id: string, fields: Partial<ISourceMetadata>): Promise<void> {
    await this.connect();
    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      setFields[`sourceMetadata.${k}`] = v;
    }
    await TokenCollection.findByIdAndUpdate(id, { $set: setFields });
  }
}
