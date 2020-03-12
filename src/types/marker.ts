import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import CrossReference from "./cross_references";
import * as logger from "../logger";
import { mapAsync, libraryPath } from "./utility";
import Label from "./label";
import Image from "./image";
import * as path from "path";
import { singleScreenshot } from "../ffmpeg/screenshot";

export default class Marker {
  _id: string;
  name: string;
  addedOn = +new Date();
  favorite: boolean = false;
  bookmark: number | null = null; // TODO: replace with timestamp
  rating: number = 0;
  customFields: any = {};
  scene: string;
  time: number; // Time in scene in seconds
  thumbnail?: string | null = null;

  static async getAll() {
    return (await database.find(database.store.markers, {})) as Marker[];
  }

  static async checkIntegrity() {
    const allMarkers = await Marker.getAll();

    for (const marker of allMarkers) {
      const markerId = marker._id.startsWith("st_")
        ? marker._id
        : `st_${marker._id}`;

      if (!marker.thumbnail) {
        await this.createMarkerThumbnail(marker);
      }
    }
  }

  static async createMarkerThumbnail(marker: Marker) {
    const scene = await Scene.getById(marker.scene);
    if (!scene || !scene.path) return;

    logger.log("Creating thumbnail for marker " + marker._id);
    const image = new Image(`${marker.name} (thumbnail)`);
    image.path = path.join(libraryPath("thumbnails/"), image._id) + ".jpg";
    image.scene = marker.scene;

    const actors = (await Scene.getActors(scene)).map(l => l._id);
    await Image.setActors(image, actors);

    const labels = (await Marker.getLabels(marker)).map(l => l._id);
    await Image.setLabels(image, labels);

    await singleScreenshot(scene.path, image.path, marker.time + 15);
    await database.insert(database.store.images, image);
    await database.update(
      database.store.markers,
      { _id: marker._id },
      {
        $set: {
          thumbnail: image._id
        }
      }
    );
  }

  static async setLabels(marker: Marker, labelIds: string[]) {
    const references = await CrossReference.getBySource(marker._id);

    const oldLabelReferences = references
      .filter(r => r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(marker._id, id);
      logger.log("Adding label to marker: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async getLabels(marker: Marker) {
    const references = await CrossReference.getBySource(marker._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("la_")),
        r => Label.getById(r.to)
      )
    ).filter(Boolean) as Label[];
  }

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.markers,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
  }

  constructor(name: string, scene: string, time: number) {
    this._id = "mk_" + generateHash();
    this.name = name;
    this.scene = scene;
    this.time = Math.round(time);
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.markers, {
      _id
    })) as Marker | null;
  }

  static async remove(_id: string) {
    await database.remove(database.store.markers, { _id });
  }

  static async removeByScene(scene: Scene) {
    await database.remove(database.store.markers, { scene: scene._id });
  }
}
