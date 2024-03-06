import { FolderState } from "../ExplorerNode";
import { getStoredFavorites } from "./util";

type MaybeHTMLElement = HTMLElement | undefined;
let currentExplorerState: FolderState[];
const observer = new IntersectionObserver((entries) => {
  // If last element is observed, remove gradient of "overflow" class so element is visible
  const explorerUl = document.getElementById("explorer-ul");
  if (!explorerUl) return;
  for (const entry of entries) {
    if (entry.isIntersecting) {
      explorerUl.classList.add("no-background");
    } else {
      explorerUl.classList.remove("no-background");
    }
  }
});

function toggleExplorer(this: HTMLElement) {
  this.classList.toggle("collapsed");
  const content = this.nextElementSibling as MaybeHTMLElement;
  if (!content) return;

  content.classList.toggle("collapsed");
  content.style.maxHeight =
    content.style.maxHeight === "0px" ? content.scrollHeight + "px" : "0px";
}

function toggleFolder(evt: MouseEvent) {
  evt.stopPropagation();
  const target = evt.target as MaybeHTMLElement;
  if (!target) return;

  const isSvg = target.nodeName === "svg";
  const childFolderContainer = (
    isSvg
      ? target.parentElement?.nextSibling
      : target.parentElement?.parentElement?.nextElementSibling
  ) as MaybeHTMLElement;
  const currentFolderParent = (
    isSvg ? target.nextElementSibling : target.parentElement
  ) as MaybeHTMLElement;
  if (!(childFolderContainer && currentFolderParent)) return;

  childFolderContainer.classList.toggle("open");
  const isCollapsed = childFolderContainer.classList.contains("open");
  setFolderState(childFolderContainer, !isCollapsed);
  const fullFolderPath = currentFolderParent.dataset.folderpath as string;
  toggleCollapsedByPath(currentExplorerState, fullFolderPath);
  const stringifiedFileTree = JSON.stringify(currentExplorerState);
  localStorage.setItem("fileTree", stringifiedFileTree);
}

function setupExplorer() {
  const explorer = document.getElementById("explorer");
  if (!explorer) return;

  if (explorer.dataset.behavior === "collapse") {
    for (const item of document.getElementsByClassName(
      "folder-button",
    ) as HTMLCollectionOf<HTMLElement>) {
      item.addEventListener("click", toggleFolder);
      window.addCleanup(() => item.removeEventListener("click", toggleFolder));
    }
  }

  explorer.addEventListener("click", toggleExplorer);
  window.addCleanup(() =>
    explorer.removeEventListener("click", toggleExplorer),
  );

  // Set up click handlers for each folder (click handler on folder "icon")
  for (const item of document.getElementsByClassName(
    "folder-icon",
  ) as HTMLCollectionOf<HTMLElement>) {
    item.addEventListener("click", toggleFolder);
    window.addCleanup(() => item.removeEventListener("click", toggleFolder));
  }

  // Get folder state from local storage
  const storageTree = localStorage.getItem("fileTree");
  const useSavedFolderState = explorer?.dataset.savestate === "true";
  const oldExplorerState: FolderState[] =
    storageTree && useSavedFolderState ? JSON.parse(storageTree) : [];
  const oldIndex = new Map(
    oldExplorerState.map((entry) => [entry.path, entry.collapsed]),
  );
  const newExplorerState: FolderState[] = explorer.dataset.tree
    ? JSON.parse(explorer.dataset.tree)
    : [];
  currentExplorerState = [];
  for (const { path, collapsed } of newExplorerState) {
    currentExplorerState.push({
      path,
      collapsed: oldIndex.get(path) ?? collapsed,
    });
  }

  currentExplorerState.map((folderState) => {
    const folderLi = document.querySelector(
      `[data-folderpath='${folderState.path}']`,
    ) as MaybeHTMLElement;
    const folderUl = folderLi?.parentElement
      ?.nextElementSibling as MaybeHTMLElement;
    if (folderUl) {
      setFolderState(folderUl, folderState.collapsed);
    }
  });
}

window.addEventListener("resize", setupExplorer);
document.addEventListener("nav", () => {
  setupExplorer();
  observer.disconnect();

  // select pseudo element at end of list
  const lastItem = document.getElementById("explorer-end");
  if (lastItem) {
    observer.observe(lastItem);
  }
});

/**
 * Toggles the state of a given folder
 * @param folderElement <div class="folder-outer"> Element of folder (parent)
 * @param collapsed if folder should be set to collapsed or not
 */
function setFolderState(folderElement: HTMLElement, collapsed: boolean) {
  return collapsed
    ? folderElement.classList.remove("open")
    : folderElement.classList.add("open");
}

/**
 * Toggles visibility of a folder
 * @param array array of FolderState (`fileTree`, either get from local storage or data attribute)
 * @param path path to folder (e.g. 'advanced/more/more2')
 */
function toggleCollapsedByPath(array: FolderState[], path: string) {
  const entry = array.find((item) => item.path === path);
  if (entry) {
    entry.collapsed = !entry.collapsed;
  }
}

// MOD: Permite que el Explorer siempre aproveche al máximo el espacio libre,
// pero también asegura que entre la lista completa.
function resizeMaxHeight() {
  const explorerUl = document.getElementById("explorer-ul");
  if (!explorerUl) return;

  // 330 son los píxeles que están por arriba del inicio del Explorer.
  explorerUl.style.height = `${window.innerHeight - 320}px`;
}

window.addEventListener("load", resizeMaxHeight);
window.addEventListener("resize", resizeMaxHeight);
document.addEventListener("nav", resizeMaxHeight);

// JS para animar y controlar el toggle de materias favoritas.
document.addEventListener("nav", () => {
  const toggle = document.getElementById("favorites-explorer-toggle")!;
  const input = toggle.querySelector("input")!;
  const explorerUl = document.getElementById("explorer-ul")!;
  const isFiltering =
    localStorage.getItem("filterFavoritesExplorer") ?? "false";

  /** Solo muestra en el `Explorer` las materias favoritas del usuario. */
  function filterFavoritesExplorer() {
    toggle.classList.add("selected");
    input.setAttribute("selected", "selected");
    explorerUl.classList.add("filtered");

    const favorites = getStoredFavorites();
    const courses = explorerUl?.querySelectorAll("span.folder-title");

    courses.forEach((course) => {
      if (favorites.includes(course.textContent ?? "")) {
        course.classList.add("shown");
      }
    });
  }

  /** Vuelve a mostrar en el `Explorer` todas las materias. */
  function unfilterFavoritesExplorer() {
    toggle.classList.remove("selected");
    input.removeAttribute("selected");
    explorerUl.classList.remove("filtered");

    const favCourses = explorerUl?.querySelectorAll(".shown");

    favCourses.forEach((element) => {
      element.classList.remove("shown");
    });
  }

  // Consultar el estado guardado previamente.
  if (isFiltering === "true") {
    filterFavoritesExplorer();
  }

  // Listener para activar o desactivar filtro.
  toggle.addEventListener("click", () => {
    const isActive = toggle.classList.contains("selected");

    if (isActive) {
      localStorage.setItem("filterFavoritesExplorer", "false");
      unfilterFavoritesExplorer();
    } else {
      localStorage.setItem("filterFavoritesExplorer", "true");
      filterFavoritesExplorer();
    }
  });
});
