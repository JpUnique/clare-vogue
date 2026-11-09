"use client";

import {
  Check,
  Clapperboard,
  FileVideo2,
  Heart,
  LockKeyhole,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

type OrderOption = {
  reference: string;
  client: string;
  garments: { id: string; name: string }[];
};

type ClientStory = {
  id: string;
  client: string;
  reference: string;
  garmentName: string;
  rating: number;
  feedback: string;
  createdAt: string;
  videoName: string | null;
  videoUrl: string | null;
  sharingApproved: boolean;
  consentMethod: "written" | "electronic" | "verbal" | null;
};

type ClientStoriesPreviewProps = {
  orders: OrderOption[];
  onNotice: (message: string) => void;
};

const initialStories: ClientStory[] = [
  {
    id: "story-1",
    client: "Amara Okafor",
    reference: "CV-2048",
    garmentName: "Ceremony two-piece",
    rating: 5,
    feedback:
      "I felt so beautiful in it. The fitting was thoughtful, and every detail felt made just for me.",
    createdAt: "Nov 1",
    videoName: null,
    videoUrl: null,
    sharingApproved: false,
    consentMethod: null,
  },
  {
    id: "story-2",
    client: "Zara Adeyemi",
    reference: "CV-2046",
    garmentName: "Draped satin dress",
    rating: 5,
    feedback:
      "The finish, the fit, the whole experience — I already know who I’m calling for my next occasion.",
    createdAt: "Oct 28",
    videoName: null,
    videoUrl: null,
    sharingApproved: false,
    consentMethod: null,
  },
  {
    id: "story-3",
    client: "Tomi Adebayo",
    reference: "CV-2044",
    garmentName: "Embellished skirt set",
    rating: 4,
    feedback:
      "Beautiful craftsmanship and a lovely experience from the first measurement to collection.",
    createdAt: "Oct 22",
    videoName: null,
    videoUrl: null,
    sharingApproved: false,
    consentMethod: null,
  },
];

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#eee5e0] bg-white px-3 text-sm font-normal text-[#493b3e] outline-none transition placeholder:text-[#b4a7a0] focus:border-[#c98ba0] focus:ring-2 focus:ring-[#a43c68]/10";

function getLocalDate(): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export default function ClientStoriesPreview({
  orders,
  onNotice,
}: ClientStoriesPreviewProps) {
  const [stories, setStories] = useState(initialStories);
  const [selectedOrderReference, setSelectedOrderReference] = useState(
    orders[0]?.reference ?? "",
  );
  const [selectedGarmentId, setSelectedGarmentId] = useState(
    orders[0]?.garments[0]?.id ?? "",
  );
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [sharingApproved, setSharingApproved] = useState(false);
  const [consentMethod, setConsentMethod] = useState<
    "written" | "electronic" | "verbal"
  >("written");
  const [error, setError] = useState("");
  const createdUrls = useRef<string[]>([]);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(
    () => () => {
      createdUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const orderCount = new Set(stories.map((story) => story.reference)).size;
  const sharedCount = stories.filter((story) => story.sharingApproved).length;
  const averageRating =
    stories.reduce((total, story) => total + story.rating, 0) /
    Math.max(1, stories.length);

  function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setVideo(null);
    setVideoUrl("");
    if (!file) return;
    if (!["video/mp4", "video/quicktime"].includes(file.type)) {
      setError("Choose an MP4 or MOV video.");
      event.target.value = "";
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError("Videos must be 200 MB or smaller.");
      event.target.value = "";
      return;
    }
    const localUrl = URL.createObjectURL(file);
    createdUrls.current.push(localUrl);
    setVideo(file);
    setVideoUrl(localUrl);
  }

  function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!video) {
      setError("Choose a customer outfit video to add to this story.");
      return;
    }
    const order = orders.find(
      (candidate) => candidate.reference === selectedOrderReference,
    );
    if (!order) {
      setError("Choose an order for this customer story.");
      return;
    }
    const garment = order.garments.find(
      (candidate) => candidate.id === selectedGarmentId,
    );
    if (!garment) {
      setError("Choose a garment for this customer video.");
      return;
    }
    if (!feedback.trim()) {
      setError("Add a short note about the customer’s satisfaction.");
      return;
    }

    setStories((current) => [
      {
        id: `story-${Date.now()}`,
        client: order.client,
        reference: order.reference,
        garmentName: garment.name,
        rating,
        feedback: feedback.trim(),
        createdAt: getLocalDate(),
        videoName: video.name,
        videoUrl,
        sharingApproved,
        consentMethod: sharingApproved ? consentMethod : null,
      },
      ...current,
    ]);
    setFeedback("");
    setVideo(null);
    setVideoUrl("");
    setSharingApproved(false);
    setRating(5);
    const fileInput = document.getElementById(
      "customer-story-video",
    ) as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
    onNotice(
      sharingApproved
        ? "Sample story added with sharing approval marked for this preview."
        : "Sample client story added privately to this preview.",
    );
  }

  return (
    <motion.section
      key="stories-view"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="space-y-5"
      id="client-story-form"
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">
          Your workroom
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#3d2c32] sm:text-4xl">
          Client stories
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#837773]">
          Keep customer outfit videos and satisfaction notes beside each
          commission.
        </p>
      </header>
      <section
        aria-label="Client story overview"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: "Client stories",
            value: stories.length,
            note: `${orderCount} sample orders`,
            icon: MessageCircleHeart,
            tint: "bg-[#fbf0f4] text-[#a43c68]",
          },
          {
            label: "Average satisfaction",
            value: `${averageRating.toFixed(1)} / 5`,
            note: "From sample feedback",
            icon: Star,
            tint: "bg-[#fff4e3] text-[#a27539]",
          },
          {
            label: "Approved for sharing",
            value: sharedCount,
            note: "Permission marked in preview",
            icon: ShieldCheck,
            tint: "bg-[#edf4ef] text-[#52715d]",
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.25,
                delay: reduceMotion ? 0 : index * 0.04,
              }}
              className="rounded-2xl border border-[#eee5e0] bg-white p-4 shadow-[0_10px_30px_-26px_rgba(61,44,50,.35)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[#887b75]">
                    {item.label}
                  </p>
                  <p className="mt-3 font-serif text-3xl text-[#43343a]">
                    {item.value}
                  </p>
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tint}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[#a0928c]">{item.note}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          className="rounded-2xl border border-[#eee5e0] bg-white p-4 shadow-[0_16px_44px_-38px_rgba(61,44,50,.35)] sm:p-6"
          onSubmit={saveStory}
        >
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-[#a43c68]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#ad6d7f]">
                The final fitting
              </p>
            </div>
            <h2 className="mt-1.5 font-serif text-xl text-[#43343a]">
              Add a client story
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#968781]">
              Keep the outfit video and the client&apos;s own words together.
            </p>
          </div>

          <label className="block text-xs font-semibold text-[#67595a]">
            Client &amp; order
            <select
              className={inputClass}
              onChange={(event) => {
                const nextReference = event.target.value;
                const nextOrder = orders.find(
                  (order) => order.reference === nextReference,
                );
                setSelectedOrderReference(nextReference);
                setSelectedGarmentId(nextOrder?.garments[0]?.id ?? "");
              }}
              required
              value={selectedOrderReference}
            >
              {orders.map((order) => (
                <option key={order.reference} value={order.reference}>
                  {order.reference} · {order.client}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-xs font-semibold text-[#67595a]">
            Outfit / garment
            <select
              className={inputClass}
              disabled={
                !orders.find(
                  (order) => order.reference === selectedOrderReference,
                )?.garments.length
              }
              onChange={(event) => setSelectedGarmentId(event.target.value)}
              required
              value={selectedGarmentId}
            >
              {orders
                .find((order) => order.reference === selectedOrderReference)
                ?.garments.map((garment) => (
                  <option key={garment.id} value={garment.id}>
                    {garment.name}
                  </option>
                ))}
            </select>
            {!orders.find(
              (order) => order.reference === selectedOrderReference,
            )?.garments.length && (
              <span className="mt-1.5 block font-normal text-[#9b315a]">
                Add a garment to this order before attaching a client video.
              </span>
            )}
          </label>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold text-[#67595a]">
              How happy was the client?
            </legend>
            <div
              aria-label="Customer satisfaction rating"
              className="mt-2 flex items-center gap-1"
              role="radiogroup"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  aria-checked={rating === value}
                  aria-label={`${value} out of 5 stars`}
                  className="rounded-md p-1.5 text-[#c2914c] transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a43c68]"
                  key={value}
                  onClick={() => setRating(value)}
                  role="radio"
                  type="button"
                >
                  <Star
                    className="h-5 w-5"
                    fill={rating >= value ? "currentColor" : "none"}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs text-[#8d7e78]">
                {rating} out of 5
              </span>
            </div>
          </fieldset>

          <label className="mt-4 block text-xs font-semibold text-[#67595a]">
            Client&apos;s satisfaction note
            <textarea
              className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-[#eee5e0] bg-white px-3 py-2.5 text-sm font-normal text-[#493b3e] outline-none transition placeholder:text-[#b4a7a0] focus:border-[#c98ba0] focus:ring-2 focus:ring-[#a43c68]/10"
              maxLength={1000}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="What did they love about the outfit or fitting?"
              required
              value={feedback}
            />
          </label>

          <div className="mt-4">
            <span className="block text-xs font-semibold text-[#67595a]">
              Outfit video
            </span>
            <label
              className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
                video
                  ? "border-[#c78fa2] bg-[#fcf6f7]"
                  : "border-[#e8dcd7] bg-[#fdfbf9] hover:border-[#d3a3b3] hover:bg-[#fcf7f5]"
              }`}
              htmlFor="customer-story-video"
            >
              {video ? (
                <>
                  <FileVideo2 className="h-6 w-6 text-[#a43c68]" />
                  <span className="mt-2 max-w-full truncate text-xs font-semibold text-[#55474a]">
                    {video.name}
                  </span>
                  <span className="mt-1 text-[10px] text-[#968781]">
                    {(video.size / (1024 * 1024)).toFixed(1)} MB · choose another
                    to replace
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-[#ad6d7f]" />
                  <span className="mt-2 text-xs font-semibold text-[#55474a]">
                    Choose an outfit video
                  </span>
                  <span className="mt-1 text-[10px] text-[#968781]">
                    MP4 or MOV · up to 200 MB
                  </span>
                </>
              )}
              <input
                accept="video/mp4,video/quicktime"
                className="sr-only"
                id="customer-story-video"
                onChange={chooseVideo}
                required={!video}
                type="file"
              />
            </label>
          </div>

          {videoUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#eee5e0] bg-[#21141b]">
              <video
                aria-label="Local outfit video preview"
                className="max-h-64 w-full"
                controls
                playsInline
                src={videoUrl}
              />
            </div>
          )}

          <fieldset className="mt-4 rounded-xl border border-[#eee5e0] p-3.5">
            <legend className="px-1 text-xs font-semibold text-[#67595a]">
              Portfolio sharing
            </legend>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[#766966]">
              <input
                checked={sharingApproved}
                className="mt-1 h-4 w-4 accent-[#a43c68]"
                onChange={(event) =>
                  setSharingApproved(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                The client has approved sharing this specific video in the
                portfolio.
              </span>
            </label>
            {sharingApproved && (
              <label className="mt-3 block text-[11px] font-semibold text-[#67595a]">
                How was approval given?
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#eee5e0] bg-white px-3 text-xs font-normal outline-none transition focus:border-[#c98ba0]"
                  onChange={(event) =>
                    setConsentMethod(
                      event.target.value as "written" | "electronic" | "verbal",
                    )
                  }
                  value={consentMethod}
                >
                  <option value="written">Written</option>
                  <option value="electronic">Electronic</option>
                  <option value="verbal">Verbal</option>
                </select>
              </label>
            )}
          </fieldset>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f7f3f0] px-3 py-2.5 text-[10px] leading-4 text-[#897c76]">
            {sharingApproved ? (
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9b7745]" />
            ) : (
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a7b71]" />
            )}
            <span>
              This is a local preview only. In the live app, customer media
              stays private unless explicit sharing permission is recorded.
            </span>
          </div>

          {error && (
            <p
              className="mt-3 rounded-lg bg-[#fff0f2] px-3 py-2 text-xs text-[#9b315a]"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#a43c68] px-4 text-sm font-semibold text-white transition hover:bg-[#8e3158]"
            type="submit"
          >
            <Heart className="h-4 w-4" />
            Add sample client story
          </button>
        </form>

        <section
          aria-labelledby="client-stories-heading"
          className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white shadow-[0_16px_44px_-38px_rgba(61,44,50,.35)]"
        >
          <div className="border-b border-[#f0e9e5] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <MessageCircleHeart className="h-4 w-4 text-[#a43c68]" />
              <h2
                className="font-serif text-xl text-[#43343a]"
                id="client-stories-heading"
              >
                Client stories
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#968781]">
              Feedback and outfit moments alongside the commission.
            </p>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {stories.map((story, index) => (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                key={story.id}
                transition={{
                  duration: reduceMotion ? 0 : 0.22,
                  delay: reduceMotion ? 0 : Math.min(index, 4) * 0.035,
                }}
                className="overflow-hidden rounded-xl border border-[#f0e9e5]"
              >
                {story.videoUrl ? (
                  <video
                    aria-label={`${story.client}'s outfit video`}
                    className="max-h-72 w-full bg-[#21141b]"
                    controls
                    playsInline
                    preload="metadata"
                    src={story.videoUrl}
                  />
                ) : (
                  <div className="flex min-h-24 items-center gap-3 bg-gradient-to-r from-[#f8eef1] to-[#f8f2e8] px-4 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#a43c68]">
                      <FileVideo2 className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-[#59474e]">
                        Sample story · no video attached
                      </span>
                      <span className="mt-1 block text-[10px] text-[#968781]">
                        Upload a customer clip to preview it here.
                      </span>
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#493b3e]">
                        {story.client}
                      </h3>
                      <p className="mt-1 text-[10px] text-[#968781]">
                        {story.reference} · {story.garmentName} · {story.createdAt}
                        {story.videoName && ` · ${story.videoName}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        story.sharingApproved
                          ? "bg-[#edf4ef] text-[#52715d]"
                          : "bg-[#f5f2ee] text-[#766966]"
                      }`}
                    >
                      {story.sharingApproved ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <LockKeyhole className="h-3 w-3" />
                      )}
                      {story.sharingApproved
                        ? `Sharing approved · ${story.consentMethod}`
                        : "Private"}
                    </span>
                  </div>
                  <div
                    aria-label={`${story.rating} out of 5 stars`}
                    className="mt-3 flex gap-0.5 text-[#c2914c]"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        fill={value <= story.rating ? "currentColor" : "none"}
                        key={value}
                      />
                    ))}
                    <span className="ml-1 text-[10px] text-[#8d7e78]">
                      Client satisfaction
                    </span>
                  </div>
                  <blockquote className="mt-2 text-xs leading-5 text-[#736662]">
                    “{story.feedback}”
                  </blockquote>
                  {story.sharingApproved && (
                    <p className="mt-3 flex items-center gap-1.5 border-t border-[#f0e9e5] pt-3 text-[10px] text-[#52715d]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Sharing approval marked for this sample video.
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </section>
    </motion.section>
  );
}
