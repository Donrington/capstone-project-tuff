import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExerciseMedia } from "@/components/exercises/ExerciseMedia";
import { exercises, getExercise, pilatesExercises } from "@/data/exercises";
import styles from "@/components/exercises/exercises.module.css";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return exercises.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getExercise(slug)?.name ?? "Exercise" };
}

export default async function ExercisePage({ params }: { params: Params }) {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) notFound();

  const sequenceIndex = pilatesExercises.findIndex((p) => p.slug === slug);
  const inSequence = sequenceIndex >= 0;
  const previous = sequenceIndex > 0 ? pilatesExercises[sequenceIndex - 1] : undefined;
  const next = inSequence ? pilatesExercises[sequenceIndex + 1] : undefined;

  return (
    <div>
      <PageHeader
        kicker={exercise.category}
        title={exercise.name}
        subtitle={
          inSequence ? (
            <>
              <span className={styles.sequenceLabel}>
                Pilates · Move {sequenceIndex + 1} of {pilatesExercises.length} in the mat sequence
              </span>
              <span className={styles.sequenceSummary}>{exercise.summary}</span>
            </>
          ) : (
            exercise.summary
          )
        }
        actions={
          <>
            <ButtonLink href={`/challenges/new?activity=${exercise.slug}`}>
              <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
              Start a challenge with this
            </ButtonLink>
            {(slug === "pushups" || slug === "squats" || slug === "plank") && (
              <ButtonLink href={`/train?exercise=${slug}`} variant="secondary">
                <Camera size={18} strokeWidth={2.25} aria-hidden="true" />
                Count with camera
              </ButtonLink>
            )}
          </>
        }
      />
      <div className={styles.detail}>
        <div className={styles.info}>
          <ExerciseMedia exercise={exercise} size="hero" />
          <section aria-labelledby="muscles-heading">
            <h2 id="muscles-heading" className={styles.panelTitle}>
              Muscles worked
            </h2>
            <ul className={styles.muscles}>
              {exercise.muscles.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className={styles.info}>
          <section className={styles.panel} aria-labelledby="cues-heading">
            <h2 id="cues-heading" className={styles.panelTitle}>
              Form cues
            </h2>
            <ol className={styles.cues}>
              {exercise.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </section>
          <section className={styles.panel} aria-labelledby="mistakes-heading">
            <h2 id="mistakes-heading" className={styles.panelTitle}>
              Common mistakes
            </h2>
            <ul className={styles.mistakes}>
              {exercise.mistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {/* At the end, where you'd go next after reading the move — and quiet,
          so it never competes with "Start a challenge with this". */}
      {inSequence && (
        <nav className={styles.sequenceNav} aria-label="Pilates mat sequence">
          {previous ? (
            <ButtonLink href={`/exercises/${previous.slug}`} variant="ghost">
              <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
              {previous.name}
            </ButtonLink>
          ) : (
            <span />
          )}
          {next ? (
            <ButtonLink href={`/exercises/${next.slug}`} variant="ghost">
              {next.name}
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
