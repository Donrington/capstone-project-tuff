"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { updateProfileAction, type UpdateProfileState } from "@/app/(app)/actions";
import type { User } from "@/lib/types";
import { PhotoUploader } from "./PhotoUploader";
import styles from "./ProfileSection.module.css";

const INITIAL: UpdateProfileState = {};
const BIO_LIMIT = 160;

export function ProfileSection({ user }: { user: User }) {
  const toast = useToast();
  const [state, formAction] = useActionState(updateProfileAction, INITIAL);
  const [bio, setBio] = useState(user.bio);

  useEffect(() => {
    if (state.ok) toast({ title: state.message ?? "Saved.", tone: "success" });
  }, [state, toast]);

  return (
    <section id="profile" className={styles.section} aria-labelledby="profile-heading">
      <h2 id="profile-heading" className={styles.heading}>
        Profile
      </h2>
      <p className={styles.sub}>How your name, photo and bio show up around TUFF.</p>

      <PhotoUploader user={user} />

      <form action={formAction} className={styles.form}>
        <div className={styles.nameRow}>
          <FormField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            defaultValue={state.values?.firstName ?? user.firstName}
            error={Boolean(state.errors?.firstName)}
            helperText={state.errors?.firstName}
          />
          <FormField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            defaultValue={state.values?.lastName ?? user.lastName}
            error={Boolean(state.errors?.lastName)}
            helperText={state.errors?.lastName}
          />
        </div>
        <FormField
          label="Display name"
          name="displayName"
          defaultValue={state.values?.displayName ?? user.displayName}
          error={Boolean(state.errors?.displayName)}
          helperText={state.errors?.displayName ?? "Shown instead of your full name around the app."}
        />
        <TextArea
          label="Bio"
          name="bio"
          rows={3}
          maxLength={BIO_LIMIT}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          error={Boolean(state.errors?.bio)}
          helperText={state.errors?.bio ?? `${BIO_LIMIT - bio.length} characters left.`}
        />
        <div className={styles.actions}>
          <SaveButton />
        </div>
      </form>
    </section>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          Saving…
        </>
      ) : (
        "Save"
      )}
    </Button>
  );
}
