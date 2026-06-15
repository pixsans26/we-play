# Requirements Document

## Introduction

The app currently displays task cards (text prompts and image cards) sourced from
hardcoded TypeScript arrays in `data/textTasks.ts` and `data/imageTasks.ts`. This
feature replaces those static arrays with live data fetched from a Directus CMS
instance via its REST API, while preserving every existing data shape, hook
interface, and game-screen behaviour unchanged.

The integration must work offline (falling back to cached then hardcoded data),
show loading indicators while fetching, persist fetched data to AsyncStorage, and
load Directus-hosted images through the `expo-image` component included in
Expo SDK 54 / Expo Go.

## Glossary

- **Directus_Client**: The service module (`services/directusClient.ts`) responsible for all HTTP communication with the Directus CMS instance.
- **DirectusURL**: The base URL of the Directus instance, read from the `EXPO_PUBLIC_DIRECTUS_URL` environment variable.
- **DirectusToken**: An optional static access token, read from the `EXPO_PUBLIC_DIRECTUS_TOKEN` environment variable. When absent, requests are made without an `Authorization` header.
- **Task**: The existing TypeScript interface `{ id, title, description, timerSeconds, level, category }` defined in `data/textTasks.ts`. Its shape MUST NOT change.
- **ImageTask**: The existing TypeScript interface `{ id, imageSource, caption, reactionPrompt, level }` defined in `data/imageTasks.ts`. Its shape MUST NOT change.
- **imageSource**: The `ImageSourcePropType` field on `ImageTask`. When data comes from Directus it holds an object `{ uri: string }` pointing to the Directus `/assets/{id}` URL. When data comes from local fallback it holds the existing `require()` result.
- **TaskRepository**: The service module (`services/taskRepository.ts`) that orchestrates fetch → cache → fallback logic and exposes `getTextTasks()` and `getImageTasks()`.
- **Cache**: Serialised task arrays stored in AsyncStorage under the keys `directus_text_tasks` and `directus_image_tasks`.
- **Cache_TTL**: The maximum age of cached data before a background refresh is triggered; default 30 minutes.
- **Hardcoded_Fallback**: The existing `TEXT_TASKS` and `IMAGE_TASKS` arrays used when no network is available and no cache exists.
- **useTasksStore**: A Zustand slice (or equivalent React hook) that exposes `textTasks`, `imageTasks`, and `tasksLoading` to consuming screens.
- **useScratchHistory**: The existing hook in `hooks/useScratchHistory.ts`. Its public interface (`getNextTask`, `logScratch`, `getSeenIds`) MUST NOT change.

---

## Requirements

### Requirement 1: Directus API Client

**User Story:** As a developer, I want a dedicated Directus client service, so that all CMS communication is centralised and configurable through environment variables without touching game screens.

#### Acceptance Criteria

1. THE Directus_Client SHALL read `EXPO_PUBLIC_DIRECTUS_URL` as the base URL for all requests at module initialisation time.
2. WHEN `EXPO_PUBLIC_DIRECTUS_TOKEN` is set, THE Directus_Client SHALL include an `Authorization: Bearer <token>` header on every outgoing request.
3. WHEN `EXPO_PUBLIC_DIRECTUS_URL` is not set, THE Directus_Client SHALL throw a descriptive configuration error that surfaces in development and is caught silently in production.
4. THE Directus_Client SHALL expose a `fetchItems(collection: string): Promise<unknown[]>` function that calls `GET {DirectusURL}/items/{collection}` and returns the parsed `data` array from the response JSON.
5. THE Directus_Client SHALL construct asset URLs using the pattern `{DirectusURL}/assets/{id}` and expose a `getAssetUrl(id: string): string` helper.
6. WHEN the HTTP response status is not in the 2xx range, THE Directus_Client SHALL throw an error containing the HTTP status code and response body; for 2xx responses the client SHALL NOT prepare or retain any error metadata.
7. WHEN a network timeout or connection error occurs, THE Directus_Client SHALL throw an error that the caller can distinguish from an HTTP error.

---

### Requirement 2: Text Tasks from Directus

**User Story:** As a player, I want task cards fetched from the Directus `text_tasks` collection, so that content can be updated in the CMS without a new app release.

#### Acceptance Criteria

1. THE TaskRepository SHALL fetch items from the `text_tasks` Directus collection using the Directus_Client.
2. WHEN the Directus response contains an item, THE TaskRepository SHALL map each item to a `Task` object with fields `id` (string), `title` (string), `description` (string), `timerSeconds` (number), `level` (number), and `category` ("romantic" | "fun" | "playful" | "dare" | "intimate").
3. WHEN a remote item has a missing or invalid `category` value, THE TaskRepository SHALL default that field to `"fun"`.
4. WHEN a remote item has a missing or non-positive `timerSeconds` value, THE TaskRepository SHALL default that field to `60`.
5. THE TaskRepository SHALL expose a `getTextTasks(): Promise<Task[]>` function that always resolves (never rejects) and returns a non-empty array.
6. FOR ALL valid `Task` objects returned by `getTextTasks`, THE TaskRepository SHALL preserve the `id`, `title`, `description`, `timerSeconds`, `level`, and `category` fields exactly as they appear after mapping.

---

### Requirement 3: Image Tasks from Directus

**User Story:** As a player, I want image cards fetched from the Directus `image_tasks` collection and displayed using Directus-hosted images, so that romantic image prompts can be updated without a new app release.

#### Acceptance Criteria

1. THE TaskRepository SHALL fetch items from the `image_tasks` Directus collection using the Directus_Client.
2. WHEN the Directus response contains an item, THE TaskRepository SHALL map each item to an `ImageTask` object with fields `id` (string), `imageSource` (`{ uri: string }` pointing to `{DirectusURL}/assets/{imageId}`), `caption` (string), `reactionPrompt` (string), and `level` (number).
3. THE TaskRepository SHALL expose a `getImageTasks(): Promise<ImageTask[]>` function that always resolves (never rejects) and returns a non-empty array.
4. THE `image-scratch.tsx` screen SHALL render image task images using the `expo-image` `Image` component (imported from `expo-image`) instead of the React Native core `Image` component, so that remote URLs load with built-in disk caching and placeholder support.
5. WHEN an image is loading from a remote URL, THE `image-scratch.tsx` screen SHALL supply the local `assets/images/tasks/placeholder.png` as the `placeholder` prop on the `expo-image` `Image` component; IF the placeholder cannot be rendered, THE screen SHALL still allow the remote image to load and display normally.
6. FOR ALL valid `ImageTask` objects returned by `getImageTasks`, THE TaskRepository SHALL set `imageSource.uri` to the string produced by `getAssetUrl(item.imageId)`.

---

### Requirement 4: Offline Fallback

**User Story:** As a player, I want the app to still work when I have no internet connection, so that my partner and I can play the game without relying on network availability.

#### Acceptance Criteria

1. WHEN a network fetch from Directus fails AND a valid Cache exists, THE TaskRepository SHALL return the cached `Task[]` or `ImageTask[]` array.
2. WHEN a network fetch from Directus fails AND no Cache exists, THE TaskRepository SHALL return the Hardcoded_Fallback array (`TEXT_TASKS` or `IMAGE_TASKS`).
3. WHEN the app is launched and the Cache is older than Cache_TTL, THE TaskRepository SHALL serve tasks from the Cache immediately and trigger a background refresh from Directus.
4. WHEN a background refresh completes successfully, THE TaskRepository SHALL update the Cache without blocking or re-rendering the current game screen.
5. IF a background refresh fails, THEN THE TaskRepository SHALL log the error and retain the existing Cache without surfacing an error to the user.

---

### Requirement 5: Loading States

**User Story:** As a player, I want to see a loading indicator while tasks are being fetched on first launch, so that the UI does not appear frozen or empty.

#### Acceptance Criteria

1. THE useTasksStore SHALL expose a `tasksLoading` boolean that is `true` while the initial task fetch (network or cache read) is in progress and `false` once tasks are available.
2. WHEN `tasksLoading` is `true`, THE `task-scratch.tsx` screen SHALL display a loading indicator (an activity spinner or "Loading…" text) instead of the scratch card.
3. WHEN `tasksLoading` is `true`, THE `image-scratch.tsx` screen SHALL display a loading indicator instead of the scratch card.
4. WHEN `tasksLoading` becomes `false`, THE task-scratch and image-scratch screens SHALL transition to the normal game UI without requiring a manual reload.
5. THE useTasksStore SHALL begin resolving `tasksLoading` to `false` within 100 milliseconds of the hook first being mounted when data is served from the in-memory or AsyncStorage cache; WHEN an actual network fetch is required and takes longer, THE screen SHALL continue showing the loading indicator until data arrives.

---

### Requirement 6: Local Caching with AsyncStorage

**User Story:** As a player, I want fetched tasks to be available immediately on subsequent app opens, so that I never have to wait for a network round-trip to start playing.

#### Acceptance Criteria

1. WHEN `getTextTasks()` fetches tasks from Directus successfully, THE TaskRepository SHALL persist the serialised `Task[]` array to AsyncStorage under the key `"directus_text_tasks"`.
2. WHEN `getImageTasks()` fetches image tasks from Directus successfully, THE TaskRepository SHALL persist the serialised `ImageTask[]` array to AsyncStorage under the key `"directus_image_tasks"`.
3. WHEN the app is opened and a valid Cache exists whose age is less than Cache_TTL, THE TaskRepository SHALL resolve `getTextTasks()` or `getImageTasks()` from the Cache without making a network call.
4. THE TaskRepository SHALL store the cache write timestamp alongside the cached data so that Cache_TTL staleness can be computed on the next app open.
5. WHEN AsyncStorage read or write fails, THE TaskRepository SHALL catch the error, log it to the console, and continue operating using the in-memory data already loaded.
6. FOR ALL cached `Task` objects, reading back from AsyncStorage and parsing the JSON SHALL produce objects with the same `id`, `title`, `description`, `timerSeconds`, `level`, and `category` values as were written (round-trip property).
7. FOR ALL cached `ImageTask` objects, reading back from AsyncStorage and parsing the JSON SHALL produce objects with the same `id`, `imageSource`, `caption`, `reactionPrompt`, and `level` values as were written (round-trip property).

---

### Requirement 7: Backward Compatibility

**User Story:** As a developer, I want every existing hook and screen interface to remain unchanged, so that the CMS integration does not break any in-flight or future features that depend on the current data contracts.

#### Acceptance Criteria

1. THE `Task` interface in `data/textTasks.ts` SHALL retain all existing fields (`id`, `title`, `description`, `timerSeconds`, `level`, `category`) with their current TypeScript types.
2. THE `ImageTask` interface in `data/imageTasks.ts` SHALL retain all existing fields (`id`, `imageSource`, `caption`, `reactionPrompt`, `level`) with their current TypeScript types.
3. THE `useScratchHistory` hook's `getNextTask(userUid, taskType, currentLevel)` function signature SHALL remain unchanged and SHALL accept the `Task | ImageTask` union type as its pool source.
4. THE `useScratchHistory` hook's `getSeenIds(userUid, taskType)` function signature and return type SHALL remain unchanged.
5. WHEN `getNextTask` is called with `taskType === "text"`, THE useScratchHistory hook SHALL use the `Task[]` array provided by `useTasksStore.textTasks` as the candidate pool, with identical filtering logic as today; IF the pool is empty or not yet loaded, THE hook SHALL return `null` without throwing.
6. WHEN `getNextTask` is called with `taskType === "image"`, THE useScratchHistory hook SHALL use the `ImageTask[]` array provided by `useTasksStore.imageTasks` as the candidate pool, with identical filtering logic as today; IF the pool is empty or not yet loaded, THE hook SHALL return `null` without throwing.
7. THE `selectNextTask` helper in `lib/taskSelection.ts` SHALL require no signature changes.
8. WHERE the `EXPO_PUBLIC_DIRECTUS_URL` environment variable is not configured, THE TaskRepository SHALL transparently serve from Hardcoded_Fallback so that the app remains fully functional without a CMS.
