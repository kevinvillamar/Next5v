"use client";

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  ImageIcon,
  X,
} from "lucide-react";
import type { GalleryImage } from "@/lib/types";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function Gallery() {
  const { addToast, updateToast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch images when debouncedSearch changes
  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
        const res = await fetch(`/api/images?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) setImages(data);
      } catch {
        if (!cancelled) addToast("Error al cargar imágenes", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImages();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, addToast]);

  function openCreate() {
    setFormTitle("");
    setFormDescription("");
    setFormFile(null);
    setFormPreview("");
    setCreateOpen(true);
  }

  function openEdit(img: GalleryImage) {
    setSelected(img);
    setFormTitle(img.title);
    setFormDescription(img.description);
    setFormFile(null);
    setFormPreview("");
    setEditOpen(true);
  }

  function openDelete(img: GalleryImage) {
    setSelected(img);
    setDeleteOpen(true);
  }

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void
  ) {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      addToast(err.error || "La carga falló", "error");
      return null;
    }
    const data = await res.json();
    return data.url;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast("El título es requerido", "error");
      return;
    }

    setFormSubmitting(true);
    const toastId = addToast("Cargando...", "loading");

    try {
      let imageUrl = "";
      if (formFile) {
        const url = await uploadFile(formFile);
        if (!url) {
          updateToast(toastId, "La carga falló", "error");
          return;
        }
        imageUrl = url;
      }

      if (!imageUrl) {
        updateToast(toastId, "Por favor selecciona una imagen", "error");
        return;
      }

      updateToast(toastId, "Creando post...", "loading");
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          image_url: imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      updateToast(toastId, "¡Post creado!", "success");
      setCreateOpen(false);
      // Force refetch by triggering search change
      setSearch(search === "" ? " " : "");
    } catch {
      updateToast(toastId, "Error al crear post", "error");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!formTitle.trim()) {
      addToast("El título es requerido", "error");
      return;
    }

    setFormSubmitting(true);
    const toastId = addToast("Actualizando...", "loading");

    try {
      let imageUrl = selected.image_url;
      if (formFile) {
        const url = await uploadFile(formFile);
        if (!url) {
          updateToast(toastId, "La carga falló", "error");
          return;
        }
        imageUrl = url;
      }

      const res = await fetch(`/api/images/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          image_url: imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      updateToast(toastId, "¡Post actualizado!", "success");
      setEditOpen(false);
      setSelected(null);
      // Force refetch by triggering search change
      setSearch(search === "" ? " " : "");
    } catch {
      updateToast(toastId, "Error al actualizar post", "error");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const toastId = addToast("Eliminando...", "loading");

    try {
      const res = await fetch(`/api/images/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");

      updateToast(toastId, "¡Post eliminado!", "success");
      setDeleteOpen(false);
      setSelected(null);
      // Force refetch by triggering search change
      setSearch(search === "" ? " " : "");
    } catch {
      updateToast(toastId, "Error al eliminar post", "error");
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Galería de Imágenes
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {images.length} {images.length === 1 ? "imagen" : "imágenes"}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Post</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {debouncedSearch ? "No se encontraron resultados" : "Sin imágenes aún"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6">
              {debouncedSearch
                ? "Intenta con otro término de búsqueda"
                : "Crea tu primer post de galería"}
            </p>
            {!debouncedSearch && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Post
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((img) => (
              <article
                key={img.id}
                className="group bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.image_url}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Overlay actions on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(img)}
                      className="p-2.5 bg-white/90 hover:bg-white rounded-xl shadow-lg text-gray-700 hover:text-blue-600 transition-all transform hover:scale-110"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDelete(img)}
                      className="p-2.5 bg-white/90 hover:bg-white rounded-xl shadow-lg text-gray-700 hover:text-red-600 transition-all transform hover:scale-110"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Text content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                    {img.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 max-h-20 overflow-hidden">
                    {img.description || "Descripción no agregada"}
                  </p>
                  <time className="block text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                    {new Date(img.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Post">
        <form onSubmit={handleCreate} className="space-y-5">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Imagen *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) =>
                handleFileSelect(e, setFormFile, setFormPreview)
              }
              className="hidden"
            />
            {formPreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formPreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormFile(null);
                    setFormPreview("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 py-8 px-4 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Haz clic para cargar imagen
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, WebP, GIF (máx 5MB)
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="create-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Título *
            </label>
            <input
              id="create-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Título de la imagen"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="create-desc"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="create-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descripción de la imagen (opcional)"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-medium text-white transition-colors"
            >
              {formSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {formSubmitting ? "Creando..." : "Crear Post"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Post">
        <form onSubmit={handleEdit} className="space-y-5">
          {/* Current image preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={formPreview || selected?.image_url || ""}
              alt="Actual"
              className="w-full h-full object-cover"
            />
          </div>

          {/* New image upload */}
          <div>
            <input
              ref={editFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) =>
                handleFileSelect(e, setFormFile, setFormPreview)
              }
              className="hidden"
            />
            <button
              type="button"
              onClick={() => editFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              <Upload className="w-4 h-4" />
              Cambiar imagen (opcional)
            </button>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Título *
            </label>
            <input
              id="edit-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-desc"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="edit-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-medium text-white transition-colors"
            >
              {formSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
              {formSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar Post"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
            <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                ¿Estás seguro de que deseas eliminar este post?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                &ldquo;{selected?.title}&rdquo; &mdash; Esta acción no se puede
                deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium text-white transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}