"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { TextArea } from "@/components/ui/TextArea";
import { updateProfileAction, type UpdateProfileState } from "@/app/(app)/actions";
import type { User } from "@/lib/types";
import { PhotoUploader } from "./PhotoUploader";
import { SaveButton, SettingsSection, useSavedToast } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: UpdateProfileState = {};
const BIO_LIMIT = 160;

export function ProfileSection({ user }: { user: User }) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL);
  const [bio, setBio] = useState(user.bio);
  useSavedToast(state);

  return (
    <SettingsSection id="profile" title="Profile" sub="How your name, photo and bio show up around TUFF.">
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
          maxLength={40}
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
    </SettingsSection>
  );
}
