import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import { ProfilePicker } from "@/components/ProfilePicker";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal text-white shadow-clay">
        <FontAwesomeIcon icon={getIcon("git-alt")} className="h-7 w-7" />
      </span>

      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        GitШлях
      </h1>
      <p className="mt-3 max-w-md text-foreground-muted">
        Курс з нуля: Git, GitHub і робота з AI-агентами. Ніяких складних
        термінів — тільки прості пояснення й практика.
      </p>

      <p className="mt-10 mb-4 text-sm font-semibold text-foreground-muted">
        Хто ти? Обери своє ім&rsquo;я, щоб почати
      </p>

      <ProfilePicker />
    </main>
  );
}
