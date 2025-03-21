<template>
  <v-container fluid>
    <div v-if="currentStudio">
      <BindTitle :value="currentStudio.name" />

      <v-row>
        <v-col cols="12" sm="6">
          <div class="text-center" v-if="!currentStudio.thumbnail">
            <v-btn @click="openThumbnailDialog">Upload logo</v-btn>
          </div>
          <div class="d-flex" v-else>
            <v-spacer></v-spacer>
            <v-hover>
              <template v-slot:default="{ hover }">
                <v-img
                  @click="openThumbnailDialog"
                  v-ripple
                  style="width: 50vw; max-width: 400px"
                  eager
                  :src="thumbnail"
                  class="hover"
                >
                  <v-fade-transition>
                    <v-overlay v-if="hover" absolute color="primary">
                      <v-icon x-large>mdi-upload</v-icon>
                    </v-overlay>
                  </v-fade-transition>
                </v-img>
              </template>
            </v-hover>
            <v-spacer></v-spacer>
          </div>
        </v-col>
        <v-col cols="12" sm="6">
          <div v-if="currentStudio.parent">
            Part of
            <router-link class="primary--text" :to="`/studio/${currentStudio.parent._id}`">{{
              currentStudio.parent.name
            }}</router-link>
          </div>
          <div v-if="currentStudio.description" class="med--text pa-2">
            {{ currentStudio.description }}
          </div>

          <div class="pt-5 pa-2">
            <div class="d-flex align-center">
              <v-icon>mdi-label</v-icon>
              <v-subheader>Labels</v-subheader>
            </div>
            <v-chip
              label
              class="mr-1 mb-1"
              small
              outlined
              v-for="label in labelNames"
              :key="label"
              >{{ label }}</v-chip
            >
            <v-chip
              label
              color="primary"
              v-ripple
              @click="openLabelSelector"
              small
              :class="`mr-1 mb-1 hover ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
              >+ Add</v-chip
            >
          </div>

          <div class="text-center mt-2">
            <v-btn
              color="primary"
              :loading="pluginLoader"
              text
              class="text-none"
              @click="runPlugins"
              >Run plugins</v-btn
            >
          </div>
        </v-col>
      </v-row>

      <v-tabs v-model="activeTab" background-color="transparent" color="primary" centered grow>
        <v-tab>Substudios</v-tab>
        <v-tab>Scenes</v-tab>
        <v-tab>Movies</v-tab>
        <v-tab>Actors</v-tab>
      </v-tabs>

      <div class="pa-2" v-if="activeTab == 0">
        <v-row v-if="currentStudio.substudios.length">
          <v-col
            class="pa-1"
            v-for="studio in currentStudio.substudios"
            :key="studio._id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            xl="2"
          >
            <studio-card :studio="studio" style="height: 100%" />
          </v-col>
        </v-row>
        <div class="mt-3 subtitle-1 text-center" v-else>
          No substudios found for {{ currentStudio.name }}
        </div>
      </div>

      <div class="pa-2" v-if="activeTab == 1">
        <v-row>
          <v-col cols="12">
            <h1 class="text-center font-weight-light">{{ currentStudio.numScenes }} scenes</h1>

            <v-row>
              <v-col
                class="pa-1"
                v-for="(scene, i) in scenes"
                :key="scene._id"
                cols="12"
                sm="6"
                md="4"
                lg="3"
                xl="2"
              >
                <scene-card v-model="scenes[i]" style="height: 100%" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <infinite-loading v-if="currentStudio" :identifier="infiniteId" @infinite="infiniteHandler">
          <div slot="no-results">
            <v-icon large>mdi-close</v-icon>
            <div>Nothing found!</div>
          </div>

          <div slot="spinner">
            <v-progress-circular indeterminate></v-progress-circular>
            <div>Loading...</div>
          </div>

          <div slot="no-more">
            <v-icon large>mdi-emoticon-wink</v-icon>
            <div>That's all!</div>
          </div>
        </infinite-loading>
      </div>

      <div class="pa-2" v-if="activeTab == 2">
        <v-row>
          <v-col cols="12">
            <h1 class="text-center font-weight-light">{{ movies.length }} movies</h1>

            <v-row>
              <v-col
                class="pa-1"
                v-for="(movie, i) in movies"
                :key="movie._id"
                cols="12"
                sm="6"
                md="4"
                lg="3"
                xl="2"
              >
                <movie-card v-model="movies[i]" style="height: 100%" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </div>

      <div v-if="activeTab == 3">
        <v-row>
          <v-col cols="12">
            <v-row>
              <v-col
                class="pa-1"
                v-for="(actor, i) in actors"
                :key="actor._id"
                cols="12"
                sm="6"
                md="3"
                lg="2"
                xl="2"
              >
                <actor-card style="height: 100%" v-model="actors[i]" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </div>
    </div>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentStudio">
        <v-card-title>Edit studio labels</v-card-title>

        <v-text-field
          clearable
          color="primary"
          hide-details
          class="px-5 mb-2"
          label="Find labels..."
          v-model="labelSearchQuery"
        />

        <v-card-text style="max-height: 400px">
          <LabelSelector
            :searchQuery="labelSearchQuery"
            :items="allLabels"
            v-model="selectedLabels"
          />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-btn @click="selectedLabels = []" text class="text-none">Clear</v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="editLabels" text color="primary" class="text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="400px">
      <v-card v-if="currentStudio" :loading="thumbnailLoader">
        <v-card-title>Set studio logo</v-card-title>
        <v-card-text>
          <v-file-input
            accept=".png,.jpg,.jpeg"
            color="primary"
            placeholder="Select an image"
            v-model="selectedThumbnail"
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadThumbnail" text class="text-none" color="primary">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "@/apollo";
import gql from "graphql-tag";
import sceneFragment from "@/fragments/scene";
import { studioModule } from "@/store/studio";
import actorFragment from "@/fragments/actor";
import imageFragment from "@/fragments/image";
import movieFragment from "@/fragments/movie";
import moment from "moment";
import Lightbox from "@/components/Lightbox.vue";
import SceneCard from "@/components/SceneCard.vue";
import MovieCard from "@/components/MovieCard.vue";
import ActorCard from "@/components/Cards/Actor.vue";
import InfiniteLoading from "vue-infinite-loading";
import { actorModule } from "@/store/actor";
import IActor from "@/types/actor";
import IImage from "@/types/image";
import ILabel from "@/types/label";
import studioFragment from "@/fragments/studio";
import IScene from "@/types/scene";
import IMovie from "@/types/movie";
import StudioCard from "@/components/StudioCard.vue";
import LabelSelector from "@/components/LabelSelector.vue";

@Component({
  components: {
    Lightbox,
    SceneCard,
    MovieCard,
    ActorCard,
    InfiniteLoading,
    StudioCard,
    LabelSelector,
  },
  beforeRouteLeave(_to, _from, next) {
    studioModule.setCurrent(null);
    next();
  },
})
export default class StudioDetails extends Vue {
  movies = [] as IMovie[];
  scenes = [] as IScene[];
  actors = [] as IActor[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  pluginLoader = false;

  infiniteId = 0;
  page = 0;

  thumbnailDialog = false;
  thumbnailLoader = false;
  selectedThumbnail = null as File | null;

  labelSearchQuery = "";

  activeTab = 0;

  uploadThumbnail() {
    if (!this.currentStudio) return;

    this.thumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation($file: Upload!, $name: String, $studio: String, $lossless: Boolean) {
          uploadImage(file: $file, name: $name, studio: $studio, lossless: $lossless) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.selectedThumbnail,
        name: this.currentStudio.name + " (thumbnail)",
        studio: this.currentStudio._id,
        lossless: true,
      },
    })
      .then((res) => {
        const image = res.data.uploadImage;
        this.setAsThumbnail(image._id);
        this.thumbnailDialog = false;
        this.selectedThumbnail = null;
      })
      .finally(() => {
        this.thumbnailLoader = false;
      });
  }

  openThumbnailDialog() {
    this.thumbnailDialog = true;
  }

  /* removeImage(index: number) {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeImages(ids: $ids)
        }
      `,
      variables: {
        ids: [this.images[index]._id]
      }
    })
      .then(res => {
        this.images.splice(index, 1);
        this.lightboxIndex = null;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  updateImage({
    index,
    key,
    value
  }: {
    index: number;
    key: string;
    value: any;
  }) {
    const images = this.images[index];
    images[key] = value;
    Vue.set(this.images, index, images);
  } */

  get currentStudio() {
    return studioModule.current;
  }

  async fetchPage() {
    if (!this.currentStudio) return;

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
                studio {
                  _id
                  name
                }
              }
            }
          }
          ${sceneFragment}
          ${actorFragment}
        `,
        variables: {
          query: {
            page: this.page,
            studios: [this.currentStudio._id],
            sortDir: "desc",
            sortBy: "addedOn",
          },
        },
      });

      return result.data.getScenes.items;
    } catch (err) {
      throw err;
    }
  }

  runPlugins() {
    if (!this.currentStudio) return;
    this.pluginLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          runStudioPlugins(ids: $ids) {
            ...StudioFragment
            numScenes
            labels {
              _id
              name
            }
            thumbnail {
              _id
            }
            parent {
              _id
              name
              labels {
                _id
                name
              }
            }
            substudios {
              ...StudioFragment
              numScenes
              labels {
                _id
                name
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        ids: [this.currentStudio._id],
      },
    })
      .then((res) => {
        studioModule.setCurrent(res.data.runStudioPlugins[0]);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.pluginLoader = false;
      });
  }

  infiniteHandler($state) {
    this.fetchPage().then((items) => {
      if (items.length) {
        this.page++;
        this.scenes.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  setAsThumbnail(id: string) {
    if (!this.currentStudio) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          thumbnail: id,
        },
      },
    })
      .then((res) => {
        studioModule.setThumbnail(id);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentStudio) return;

    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            labels {
              _id
              name
              aliases
            }
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          labels: this.selectedLabels.map((i) => this.allLabels[i]).map((l) => l._id),
        },
      },
    })
      .then((res) => {
        studioModule.setLabels(res.data.updateStudios[0].labels);
        this.labelSelectorDialog = false;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.labelEditLoader = false;
      });
  }

  openLabelSelector() {
    if (!this.currentStudio) return;

    if (!this.allLabels.length) {
      ApolloClient.query({
        query: gql`
          {
            getLabels {
              _id
              name
              aliases
            }
          }
        `,
      })
        .then((res) => {
          if (!this.currentStudio) return;

          this.allLabels = res.data.getLabels;
          this.selectedLabels = this.currentStudio.labels.map((l) =>
            this.allLabels.findIndex((k) => k._id == l._id)
          );
          this.labelSelectorDialog = true;
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  get labelNames() {
    if (!this.currentStudio) return [];
    return this.currentStudio.labels.map((l) => l.name).sort();
  }

  get thumbnail() {
    if (this.currentStudio && this.currentStudio.thumbnail)
      return `${serverBase}/media/image/${
        this.currentStudio.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return `${serverBase}/broken`;
  }

  @Watch("$route.params.id")
  onRouteChange() {
    studioModule.setCurrent(null);
    this.movies = [];
    this.scenes = [];
    this.selectedLabels = [];
    this.page = 0;
    this.onLoad();
  }

  @Watch("activeTab")
  onTabChange(val: number) {
    if (val === 2 && !this.movies.length) this.loadMovies();
    if (val === 3 && !this.actors.length) this.loadActors();
  }

  loadActors() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getStudioById(id: $id) {
            actors {
              ...ActorFragment
              thumbnail {
                _id
                color
              }
              labels {
                _id
                name
              }
            }
          }
        }
        ${actorFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id,
      },
    }).then((res) => {
      this.actors = res.data.getStudioById.actors;
    });
  }

  loadMovies() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getStudioById(id: $id) {
            movies {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                ...SceneFragment
              }
              studio {
                ...StudioFragment
              }
            }
          }
        }
        ${movieFragment}
        ${actorFragment}
        ${sceneFragment}
        ${studioFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id,
      },
    }).then((res) => {
      this.movies = res.data.getStudioById.movies;
    });
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getStudioById(id: $id) {
            ...StudioFragment
            numScenes
            labels {
              _id
              name
            }
            thumbnail {
              _id
            }
            parent {
              _id
              name
              labels {
                _id
                name
              }
            }
            substudios {
              ...StudioFragment
              numScenes
              labels {
                _id
                name
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id,
      },
    }).then((res) => {
      studioModule.setCurrent(res.data.getStudioById);
    });
  }

  beforeMount() {
    this.onLoad();
  }
}
</script>

<style lang="scss" scoped>
.corner-actions {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>