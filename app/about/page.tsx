import type { Metadata } from 'next';
import { site, abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '關於本站與免責聲明',
  description: '股癌筆記是非官方的第三方整理，與節目及其製作方沒有任何關係，內容可能有錯，不構成投資建議。',
  alternates: { canonical: abs('/about/') },
};

const Section = ({ h, children }: { h: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="">{h}</h2>
    <div className="mt-2 space-y-2">{children}</div>
  </section>
);

export default function About() {
  return (
    <>
      <h1 className="">關於本站</h1>
      <p className="mt-2">
        {site.name}是股癌 Podcast 的個人筆記：每一集整理成重點與相關個股，
        列出提到的個股與看多看空，每一句都附原話與時間碼，在手機上點一下就跳回那一段。
      </p>

      <Section h="非官方">
        <p>
          本站與股癌節目、主持人及其製作方<strong>沒有任何關係</strong>，不是官方、也未經授權。
          站名、頁面標題裡出現節目名稱，只是為了指稱「這是哪一集的筆記」。
        </p>
      </Section>

      <Section h="內容是怎麼來的">
        <p>
          音檔取自節目公開 RSS；文字先轉成逐字稿，再由程式抽出個股代號，摘要與立場也由本機的模型產生。<strong>這幾段都可能出錯</strong>——
          已知的錯法包含把一般英文詞當成股票代號、以及漏掉只用中文講的公司名。
        </p>
        <p>
          所以每一列都附時間碼：<strong>不要只信這一頁，點下去自己聽那一段。</strong>
          我們認為可能誤抓的代號會標成「待人工確認」，並且不列入個股頁與任何統計。
        </p>
        <p>
          集號（EP 編號）由發布日往回推定（節目為每週三、週六各一集），未與官方編號逐集核對。
        </p>
      </Section>

      <Section h="版權">
        <p>
          節目內容的著作權屬於原作者。本站不收錄全文逐字稿，引用原話時只取短句並附時間碼與原集連結，
          目的是指出「這句話在哪裡」，讓讀者回到原始來源。音檔以原始 RSS 連結播放，本站不轉存、不重新散布。
        </p>
        <p className="font-semibold">若原作者對資料發佈有異議，將立即移除。</p>
      </Section>

      <Section h="不是投資建議">
        <p>
          本站是<strong>紀錄</strong>，不是建議。站上不會出現買進、賣出、目標價、進出場價位，
          也不提供勝率、報酬率或任何績效宣稱。立場標籤呈現的是
          <strong>「模型對這一段話的讀法」</strong>，不是節目的意思，更不是我們的意見。
        </p>
        <p>
          依本站內容所做的任何決定，後果自負。
        </p>
      </Section>

      <Section h="下架與勘誤聯絡">
        <p>
          發現錯誤，或你是權利人希望本站移除任何內容，請來信 <code>{site.contact}</code>。
          收到任何一方的下架要求，<strong>先下架再談</strong>。
        </p>
      </Section>

      <Section h="隱私">
        <p>
          本站是純靜態網頁，沒有登入、沒有表單，不主動蒐集個人資料。
          目前<strong>沒有</strong>投放廣告，也沒有載入任何第三方廣告或追蹤程式碼。
          日後若投放廣告，會在這一頁先寫清楚用了哪些服務與 cookie。
        </p>
      </Section>
    </>
  );
}
