"use client";

import { useState } from "react";
import { LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { Tabs, tabPanelId, tabId } from "@/components/ui/Tabs";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { RadioChips } from "@/components/ui/RadioChips";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import styles from "./showcase.module.css";

export function Showcase() {
  const toast = useToast();
  const [dialog, setDialog] = useState<"sm" | "md" | "lg" | null>(null);
  const [tab, setTab] = useState(0);
  const [chips, setChips] = useState<string | string[]>("solo");

  return (
    <div className={styles.page}>
      <Section title="Button">
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="metal">Upgrade to Pro</Button>
        </div>
        <div className={styles.row}>
          <Button variant="primary" size="lg">
            Primary large
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" disabled aria-busy="true">
            Submitting…
          </Button>
          <ButtonLink href="/dev/ui" variant="secondary">
            ButtonLink
          </ButtonLink>
          <ButtonLink href="/dev/ui" variant="metal">
            Metal link
          </ButtonLink>
        </div>
        <div className={styles.narrow}>
          <Button variant="primary" fullWidth>
            Full width
          </Button>
        </div>
      </Section>

      <Section title="Dialog">
        <div className={styles.row}>
          <Button onClick={() => setDialog("sm")}>Small</Button>
          <Button onClick={() => setDialog("md")}>Medium</Button>
          <Button onClick={() => setDialog("lg")}>Large</Button>
        </div>
        <Dialog
          open={dialog !== null}
          onClose={() => setDialog(null)}
          size={dialog ?? "md"}
          title="Log today's set"
          description="Escape, the backdrop and the close button all shut this."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDialog(null);
                  toast({ title: "Logged 25 reps.", description: "79 to go.", tone: "success" });
                }}
              >
                Log 25 reps
              </Button>
            </>
          }
        >
          <div className={styles.stack}>
            <FormField label="How many reps?" name="amount" type="number" defaultValue={25} />
            <RadioChips
              legend="When"
              name="when"
              options={[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
              ]}
              defaultValue="today"
            />
          </div>
        </Dialog>
      </Section>

      <Section title="Toast">
        <div className={styles.row}>
          <Button onClick={() => toast({ title: "Link copied." })}>Neutral</Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Push-Up Power Week cleared.",
                description: "Two days to spare.",
                tone: "success",
              })
            }
          >
            Success
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast({
                title: "That didn't save.",
                description: "Check your connection and try again.",
                tone: "danger",
                action: { label: "Retry", onClick: () => toast({ title: "Retrying…" }) },
              })
            }
          >
            Danger, with an action
          </Button>
        </div>
      </Section>

      <Section title="Menu">
        <Menu
          label="Account"
          align="start"
          triggerClassName={styles.menuTrigger}
          trigger={<>Kelechi Obi</>}
          items={[
            { label: "View profile", icon: UserRound, href: "/profile" },
            { label: "Settings", icon: Settings, href: "/dev/ui" },
            {
              label: "Dark",
              icon: Moon,
              checked: true,
              onSelect: () => toast({ title: "Theme stays dark until #19." }),
              separatorBefore: true,
            },
            { label: "Light", icon: Sun, onSelect: () => toast({ title: "Light mode lands in #19." }) },
            {
              label: "Sign out",
              icon: LogOut,
              danger: true,
              separatorBefore: true,
              onSelect: () => toast({ title: "Sign out arrives with #14." }),
            },
          ]}
        />
      </Section>

      <Section title="Tabs">
        <Tabs
          tabs={["All", "Solo", "Team"]}
          idBase="showcase"
          index={tab}
          onChange={setTab}
        />
        {["All", "Solo", "Team"].map((label, i) => (
          <div
            key={label}
            role="tabpanel"
            id={tabPanelId("showcase", i)}
            aria-labelledby={tabId("showcase", i)}
            hidden={tab !== i}
            className={styles.panel}
          >
            {label} panel — arrow keys, Home and End move between the tabs.
          </div>
        ))}
      </Section>

      <Section title="Form controls">
        <div className={styles.grid}>
          <FormField label="Full name" name="name" placeholder="Your full name" />
          <FormField
            label="Email"
            name="email"
            type="email"
            defaultValue="not-an-email"
            error
            helperText="That doesn't look like an email address."
          />
          <PasswordField label="Password" name="password" placeholder="At least 8 characters" />
          <FormField label="Disabled" name="disabled" placeholder="Nothing to see" disabled />
          <Select
            label="Challenge"
            name="challenge"
            defaultValue="pushup-power-week"
            options={[
              { value: "10k-steps", label: "10K Steps Challenge" },
              { value: "pushup-power-week", label: "Push-Up Power Week" },
              { value: "plank-ladder", label: "Plank Ladder" },
            ]}
          />
          <Select
            label="Select with an error"
            name="broken"
            placeholder="Pick one"
            defaultValue=""
            error
            helperText="Pick a challenge to log against."
            options={[{ value: "10k-steps", label: "10K Steps Challenge" }]}
          />
        </div>

        <TextArea
          label="Note"
          name="note"
          placeholder="Optional — up to 140 characters."
          maxLength={140}
          helperText="140 characters left."
        />

        <RadioChips
          legend="Challenge type"
          name="type"
          value={chips}
          onChange={setChips}
          options={[
            { value: "solo", label: "Solo", hint: "Just you against the target." },
            { value: "team", label: "Team", hint: "Everyone's totals add up." },
            { value: "custom", label: "Custom", hint: "Name it yourself.", badge: <Badge variant="surge">Pro</Badge> },
          ]}
        />

        <RadioChips
          legend="Quick add"
          name="quick"
          multiple
          defaultValue={["reps"]}
          options={[
            { value: "reps", label: "+10 reps" },
            { value: "steps", label: "+1,000 steps" },
            { value: "seconds", label: "+30 seconds" },
            { value: "locked", label: "Disabled", disabled: true },
          ]}
        />

        <RadioChips
          legend="With an error"
          name="broken-chips"
          error="Pick how long the challenge runs."
          options={[
            { value: "7", label: "7 days" },
            { value: "14", label: "14 days" },
          ]}
        />

        <div className={styles.narrow}>
          <Switch label="Streak reminders" name="streak" hint="A nudge at 8pm if you haven't logged." defaultChecked />
          <Switch label="Weekly summary email" name="summary" />
          <Switch label="Coming soon" name="soon" hint="Waiting on the backend." disabled />
          <Checkbox id="terms" name="terms" label="I agree to the Terms and Privacy Policy." />
          <Checkbox id="terms-error" name="terms-error" label="With an error" error="Accept the terms to continue." />
        </div>
      </Section>

      <Section title="Skeleton">
        <div className={styles.skeletons}>
          <Skeleton height={44} radius="var(--radius-full)" />
          <Skeleton height={140} radius="var(--radius-xl)" />
          <div className={styles.row}>
            <Skeleton width={120} height={16} />
            <Skeleton width={72} height={16} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
