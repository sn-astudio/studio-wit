import { Header } from "@/components/Header";
import { MyPage } from "@/components/MyPage";

export default function MyPageRoute() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <MyPage />
      </main>
    </div>
  );
}
