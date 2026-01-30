// frontend/src/pages/TermsOfService.jsx
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../components/LanguageToggle.jsx";

const TermsOfService = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };

  return (
    <div className="min-h-screen bg-myGray3 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-myBlack border-b border-myGray2 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <LanguageToggle />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white dark:bg-myBlack rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
          {/* Title */}
          <div className="border-b-2 border-[#f9ee34] pb-4 mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-myBlack dark:text-myWhite mb-2">
              {t("terms.title")}
            </h1>
            <p className="text-xs sm:text-sm text-myGray2">
              {t("terms.lastUpdate")} {formatDate(new Date().toISOString())}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4 sm:space-y-6">
            {/* Section 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">1</span>
                <span className="break-words">{t("terms.section1.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10">
                {t("terms.section1.content")}
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">2</span>
                <span className="break-words">{t("terms.section2.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10">
                {t("terms.section2.content")}
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">3</span>
                <span className="break-words">{t("terms.section3.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section3.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">4</span>
                <span className="break-words">{t("terms.section4.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-1 sm:mb-2">
                {t("terms.section4.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section4.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">5</span>
                <span className="break-words">{t("terms.section5.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section5.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">6</span>
                <span className="break-words">{t("terms.section6.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-2 sm:mb-3">
                {t("terms.section6.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside mb-2 sm:mb-3">
                {t("terms.section6.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">7</span>
                <span className="break-words">{t("terms.section7.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section7.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">8</span>
                <span className="break-words">{t("terms.section8.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section8.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">9</span>
                <span className="break-words">{t("terms.section9.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.section9.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* RGPD Section */}
        <div className="bg-white dark:bg-myBlack rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          <div className="border-b-2 border-[#f9ee34] pb-4 mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-myBlack dark:text-myWhite mb-2">
              {t("terms.privacyTitle")}
            </h1>
            <p className="text-xs sm:text-sm text-myGray2">
              {t("terms.privacySubtitle")}
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* RGPD Section 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">1</span>
                <span className="break-words">{t("terms.privacy1.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-1 sm:mb-2">
                {t("terms.privacy1.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy1.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* RGPD Section 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">2</span>
                <span className="break-words">{t("terms.privacy2.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-1 sm:mb-2">
                {t("terms.privacy2.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy2.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* RGPD Section 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">3</span>
                <span className="break-words">{t("terms.privacy3.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy3.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* RGPD Section 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">4</span>
                <span className="break-words">{t("terms.privacy4.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-1 sm:mb-2">
                {t("terms.privacy4.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy4.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
              <div className="ml-0 sm:ml-10 mt-3 sm:mt-4 bg-[#ffeca2] dark:bg-[#f9ee34]/20 p-3 sm:p-4 rounded-lg border-l-4 border-[#f9ee34]">
                <p className="text-myBlack dark:text-[#dfdedd] text-sm sm:text-base">
                  <strong>{t("terms.privacy4.contact")}</strong> <a href="mailto:owly.team.app@gmail.com" className="text-myBlack dark:text-myWhite break-all">owly.team.app@gmail.com</a>
                </p>
              </div>
            </section>

            {/* RGPD Section 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">5</span>
                <span className="break-words">{t("terms.privacy5.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy5.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* RGPD Section 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">6</span>
                <span className="break-words">{t("terms.privacy6.title")}</span>
              </h2>
              <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 mb-1 sm:mb-2">
                {t("terms.privacy6.intro")}
              </p>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy6.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>

            {/* RGPD Section 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-[#f9ee34] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="bg-[#f9ee34] text-myBlack w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">7</span>
                <span className="break-words">{t("terms.privacy7.title")}</span>
              </h2>
              <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base ml-0 sm:ml-10 space-y-1 sm:space-y-2 list-disc list-inside">
                {t("terms.privacy7.items", { returnObjects: true }).map((item, index) => (
                  <li key={index} className="break-words">{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
   {/* Section bonus académique - Easter Egg */}
<div className="bg-white dark:bg-myBlack rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mt-6 sm:mt-8 border-2 border-[#f9ee34]">
  <div className="text-center">
    <h2 className="text-xl sm:text-2xl font-bold text-[#f9ee34] mb-3 sm:mb-4">
      {t("academic.title")}
    </h2>
    <p className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base mb-3">
      {t("academic.intro")}
    </p>
    <ul className="text-myBlack dark:text-[#dfdedd] leading-relaxed text-sm sm:text-base space-y-2 list-disc list-inside max-w-2xl mx-auto text-left">
      {t("academic.items", { returnObjects: true }).map((item, index) => (
        <li key={index} className="break-words" dangerouslySetInnerHTML={{ __html: item }}></li>
      ))}
    </ul>
    <p className="text-xs sm:text-sm text-myGray2 mt-4 italic">
      {t("academic.ps")}
    </p>
  </div>
</div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 pb-6 sm:pb-8">
          <p className="text-myGray2 text-xs sm:text-sm">
            © {new Date().getFullYear()} Owly. {t("terms.footer")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;