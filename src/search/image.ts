import ora from "ora";
import asyncPool from "tiny-async-pool";

import Image from "../types/image";
import { mapAsync } from "../utils/async";
import * as logger from "../utils/logger";
import {
  buildPagination,
  filterActors,
  filterBookmark,
  filterExclude,
  filterFavorites,
  filterInclude,
  filterRating,
  filterStudios,
} from "./common";
import { Gianna } from "./internal";

export let index!: Gianna.Index<IImageSearchDoc>;

const FIELDS = ["name", "labels", "actors", "studioName", "sceneName", "actorNames", "labelNames"];

export interface IImageSearchDoc {
  _id: string;
  name: string;
  addedOn: number;
  actors: string[];
  labels: string[];
  actorNames: string[];
  labelNames: string[];
  bookmark: number | null;
  favorite: boolean;
  rating: number;
  scene: string | null;
  sceneName: string | null;
  studioName: string | null;
}

export async function updateImages(images: Image[]): Promise<void> {
  return index.update(await mapAsync(images, createImageSearchDoc));
}

const blacklist = [
  "(alt. thumbnail)",
  "(thumbnail)",
  "(preview)",
  "(front cover)",
  "(back cover)",
  "(spine cover)",
  "(hero image)",
  "(avatar)",
];

export function isBlacklisted(name: string): boolean {
  return blacklist.some((ending) => name.endsWith(ending));
}

export const sliceArray = (size: number) => <T>(
  arr: T[],
  cb: (value: T[], index: number, arr: T[]) => unknown
): void => {
  let index = 0;
  let slice = arr.slice(index, index + size);
  while (slice.length) {
    const result = cb(slice, index, arr);
    if (result) break;
    index += size;
    slice = arr.slice(index, index + size);
  }
};

export const getSlices = (size: number) => <T>(arr: T[]): T[][] => {
  const slices = [] as T[][];
  sliceArray(size)(arr, (slice) => {
    slices.push(slice);
  });
  return slices;
};

export async function indexImages(images: Image[]): Promise<number> {
  if (!images.length) return 0;
  const slices = getSlices(2500)(images);

  await asyncPool(4, slices, async (slice) => {
    const docs = [] as IImageSearchDoc[];
    await asyncPool(16, slice, async (image) => {
      if (!isBlacklisted(image.name)) docs.push(await createImageSearchDoc(image));
    });
    await addImageSearchDocs(docs);
  });

  return images.length;
}

export async function addImageSearchDocs(docs: IImageSearchDoc[]): Promise<void> {
  logger.log(`Indexing ${docs.length} items...`);
  const timeNow = +new Date();
  const res = await index.index(docs);
  logger.log(`Gianna indexing done in ${(Date.now() - timeNow) / 1000}s`);
  return res;
}

export async function buildImageIndex(): Promise<Gianna.Index<IImageSearchDoc>> {
  index = await Gianna.createIndex("images", FIELDS);

  const timeNow = +new Date();
  const loader = ora("Building image index...").start();

  const res = await indexImages(await Image.getAll());

  loader.succeed(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  logger.log(`Index size: ${res} items`);

  return index;
}

export async function createImageSearchDoc(image: Image): Promise<IImageSearchDoc> {
  const labels = await Image.getLabels(image);
  const actors = await Image.getActors(image);

  return {
    _id: image._id,
    addedOn: image.addedOn,
    name: image.name,
    labels: labels.map((l) => l._id),
    actors: actors.map((a) => a._id),
    actorNames: actors.map((a) => [a.name, ...a.aliases]).flat(),
    labelNames: labels.map((l) => [l.name, ...l.aliases]).flat(),
    rating: image.rating || 0,
    bookmark: image.bookmark,
    favorite: image.favorite,
    scene: image.scene,
    sceneName: null, // TODO:
    studioName: null, // TODO:
  };
}

export interface IImageSearchQuery {
  query: string;
  favorite?: boolean;
  bookmark?: boolean;
  rating: number;
  include?: string[];
  exclude?: string[];
  studios?: string[];
  actors?: string[];
  scenes?: string[];
  sortBy?: string;
  sortDir?: string;
  skip?: number;
  take?: number;
  page?: number;
}

export async function searchImages(
  options: Partial<IImageSearchQuery>,
  shuffleSeed = "default"
): Promise<Gianna.ISearchResults> {
  logger.log(`Searching images for '${options.query}'...`);

  let sort = undefined as Gianna.ISortOptions | undefined;
  const filter = {
    type: "AND",
    children: [],
  } as Gianna.IFilterTreeGrouping;

  filterFavorites(filter, options);
  filterBookmark(filter, options);
  filterRating(filter, options);
  filterInclude(filter, options);
  filterExclude(filter, options);
  filterActors(filter, options);
  filterStudios(filter, options);

  if (options.scenes && options.scenes.length) {
    filter.children.push({
      type: "OR",
      children: options.scenes.map((sceneId) => ({
        condition: {
          operation: "=",
          property: "scene",
          type: "string",
          value: sceneId,
        },
      })),
    });
  }

  if (!options.query && options.sortBy === "relevance") {
    logger.log("No search query, defaulting to sortBy addedOn");
    options.sortBy = "addedOn";
    options.sortDir = "desc";
  }

  if (options.sortBy) {
    if (options.sortBy === "$shuffle") {
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: "$shuffle",
        // eslint-disable-next-line camelcase
        sort_asc: false,
        // eslint-disable-next-line camelcase
        sort_type: shuffleSeed,
      };
    } else {
      // eslint-disable-next-line
      const sortType: string = {
        name: "string",
        addedOn: "number",
        rating: "number",
        bookmark: "number",
      }[options.sortBy];
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: options.sortBy,
        // eslint-disable-next-line camelcase
        sort_asc: options.sortDir === "asc",
        // eslint-disable-next-line camelcase
        sort_type: sortType,
      };
    }
  }

  return index.search({
    query: options.query,
    sort,
    filter,
    ...buildPagination(options.take, options.skip, options.page),
  });
}
