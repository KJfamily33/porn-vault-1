<template>
  <div>
    <v-autocomplete
      color="primary"
      v-model="innerValue"
      :loading="loading"
      :items="scenes"
      :search-input.sync="searchQuery"
      cache-items
      hide-no-data
      hint="Search for scenes by typing something"
      persistent-hint
      :label="multiple ? 'Select scenes' : 'Select scene'"
      :multiple="multiple"
      item-text="name"
      item-value="_id"
      clearable
      @change="onInnerValueChange"
    >
      <template v-slot:item="{ item }">
        <template>
          <v-list-item-avatar>
            <img style="object-fit: cover" :src="thumbnail(item)" />
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title v-html="item.name"></v-list-item-title>
          </v-list-item-content>
        </template>
      </template>
    </v-autocomplete>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import sceneFragment from "../fragments/scene";
import IScene from "../types/scene";

export function createObjectSet<T extends Record<string, any>>(objs: T[], key: keyof T & string) {
  const dict = {} as { [key: string]: T };
  for (const obj of objs) {
    dict[obj[key]] = obj;
  }
  const set = [] as T[];
  for (const key in dict) {
    set.push(dict[key]);
  }
  return set;
}

@Component
export default class SceneSelector extends Vue {
  @Prop() value!: IScene | IScene[];
  @Prop({ default: false }) multiple!: boolean;

  innerValue = (() => {
    if (!this.multiple) {
      return this.value ? JSON.parse(JSON.stringify(this.value)) : null;
    }
    return JSON.parse(JSON.stringify(this.value)) || [];
  })();

  scenes: IScene[] = (() => {
    if (!this.multiple) {
      return this.value ? [this.value] : [];
    }
    return this.value ? JSON.parse(JSON.stringify(this.value)) : null;
  })();

  searchQuery = "";

  loading = false;
  resetTimeout = null as NodeJS.Timeout | null;

  @Watch("value", { deep: true })
  onValueChange(newVal: IScene | IScene[]) {
    this.innerValue = newVal;
    this.scenes.push(...(Array.isArray(this.value) ? this.value : [this.value]));
    this.scenes = createObjectSet(this.scenes, "_id");
  }

  onInnerValueChange(newVal: string | string[]) {
    if (this.multiple && Array.isArray(newVal)) {
      this.$emit(
        "input",
        newVal.map((id) => this.scenes.find((a) => a._id == id)).filter(Boolean) as IScene[]
      );
    } else
      this.$emit(
        "input",
        this.scenes.find((a) => a._id == newVal)
      );
  }

  thumbnail(scene: IScene) {
    console.log("get thumb of scene ", JSON.parse(JSON.stringify(scene)));
    if (scene.thumbnail)
      return `${serverBase}/media/image/${scene.thumbnail._id}?password=${localStorage.getItem(
        "password"
      )}`;
    return "";
  }

  @Watch("searchQuery")
  onSearch(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    if (!this.searchQuery) {
      return;
    }

    this.resetTimeout = setTimeout(() => {
      this.loading = true;
      this.fetchPage(this.searchQuery);
    }, 500);
  }

  async fetchPage(searchQuery: string) {
    try {
      const result = await ApolloClient.query({
        query: gql`
          query($query: SceneSearchQuery!) {
            getScenes(query: $query) {
              items {
                ...SceneFragment
                actors {
                  ...ActorFragment
                }
              }
            }
          }
          ${sceneFragment}
          ${actorFragment}
        `,
        variables: {
          query: {
            query: searchQuery || "",
          },
        },
      });
      this.loading = false;
      this.scenes.push(...result.data.getScenes.items);
      this.scenes = createObjectSet(this.scenes, "_id");
    } catch (err) {
      throw err;
    }
  }
}
</script>

<style lang="scss" scoped></style>
