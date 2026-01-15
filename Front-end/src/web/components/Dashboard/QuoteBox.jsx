import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react"; // Optional icon for flair
import "./Styles/QuoteBox.css";

const quotes = [
"Cloud is just someone else's computer. Security still matters.",

"Security in the cloud is a shared responsibility — know your part.",   

"Encryption is not a barrier; it’s a bridge to trust.",

"The cloud doesn’t eliminate security risks — it changes them.",

"You can outsource infrastructure, but not accountability.",

"Security isn’t just a feature. It’s the foundation of trust.",

"Strong cloud security is invisible — until it’s not there.",

"Hackers don’t break in — they log in. Secure your credentials.",

"Privacy is not an option, and it shouldn’t be the price we accept for using the cloud.",

"Data is the new oil — secure it like a vault, not a leaky barrel.",

"Don’t trust the cloud — secure it.",

"Compliance is not security. Start with security, and compliance will follow.",

"Zero trust isn't paranoia. It's smart architecture.",

"Firewalls can't protect weak passwords.",

"Cloud security is not optional — it's operational.",

"Amateurs hack systems; professionals hack people.",

"Cybersecurity is much more than a matter of IT.",

"Passwords are like underwear: don't share them, change them often, and keep them private.",

"It takes 20 years to build a reputation and a few minutes of cyber-incident to ruin it.",

"If you spend more on coffee than on IT security, you will be hacked.",

"Security isn't something you buy, it's something you do.",

"The weakest link in the security chain is the human element.",

"Phishing is a major problem because there really is no patch for human stupidity.",

"Like a lighthouse in a restless sea, cybersecurity shines not by predicting storms, but by facing the unexpected.",

"Cloud computing is often far more secure than traditional computing.",

"There's no silver bullet solution with cybersecurity; a layered defense is the only viable defense.",

"Security should be built in, not bolt-on.",

"If it's smart, it's vulnerable.",

"You have to find the needle in the haystack on which vulnerability to focus on.",

"Invest in smart cybersecurity tools that can improve the visibility and management of all identities.",

"Adopt modern Identity and access management tools that can monitor both human and non-human identities.",

"Password security: implement robust cyber hygiene policies.",

"Cybersecurity continues to be an increasingly hot topic.",

"Defending business networks from the dangers of cyber attacks can seem daunting at times.",

"Successful cybersecurity is all about having the right perspective.",

"Security incidents are inevitable, but the way you respond is essential.",

"Security isn't something you buy, it's something you do, and it takes talented people to do it right.",

"Cloud computing is often far more secure than traditional computing.",

"Cloud computing rings represent performance, resilience, data sovereignty, interoperability, and reversibility.",

"With cloud computing, it is no longer a question of if, but rather when and how.",

"Cloud security is fundamental, not optional.",

"Transparency fosters trust and accountability.",

"Openness of standards, systems, and software empowers and protects users.",

"Interoperability ensures effectiveness of cloud computing as a public resource.",

"Security is the foundation of trust in the cloud.",

"Cloud security requires a proactive approach.",

"Data breaches are not a matter of if, but when." ,

"Secure your cloud like your business depends on it — because it does." ,

"The cloud is secure — if you secure it." ,

"Shared responsibility means shared vigilance." ,

"In the cloud, security is a continuous process, not a one-time setup." ,

"Your cloud provider secures the infrastructure; you secure your data.",

"Cloud security is a journey, not a destination." ,

"Security in the cloud is about people, processes, and technology." ,

"Trust in the cloud is earned through security." ,

"The cloud offers scalability, but security must scale with it.",

"Cloud security is not just an IT issue; it's a business imperative." ,

"In the cloud, your data is only as secure as your weakest link." ,

"Cloud security requires constant vigilance and adaptation." ,

"Security in the cloud is a shared journey between provider and customer." ,

"Cloud security is about protecting data, applications, and identities.",

"The cloud brings new opportunities and new security challenges." ,

"Cloud security is essential for digital transformation.",

"Secure cloud adoption requires a comprehensive security strategy." ,

"Cloud security is not a product; it's a practice." ,

"In the cloud, security is everyone's responsibility." ,

"Cloud security is about enabling business, not hindering it.",

"A secure cloud is a competitive advantage." ,

"Cloud security must be integrated into the development lifecycle." ,

"Security in the cloud is about managing risk, not eliminating it." ,

"Cloud security is a balance between usability and protection." ,

"The cloud is only as secure as your policies and practices.",

"Cloud security is about visibility, control, and compliance." ,

"In the cloud, security must be continuous and automated." ,

"Cloud security is a shared goal requiring collaboration and communication." ,

"Cloud security is about protecting the confidentiality, integrity, and availability of data.",

"Security in the cloud is about understanding and managing shared responsibilities." ,

"Cloud security is about building trust through transparency and accountability." ,

"In the cloud, security must be built-in, not bolted-on." ,

"Cloud security is about aligning security controls with business objectives." ,

"Security in the cloud requires a culture of security awareness and training." ,

"Cloud security is about continuous monitoring and improvement." ,

"In the cloud, security is an enabler of innovation." ,

"Cloud security is about protecting data wherever it resides." ,

"Security in the cloud is about ensuring the right people have the right access at the right time.",

"Cloud security is about managing identities and access effectively." ,

"In the cloud, security must be agile and adaptable." ,

"Cloud security is about understanding and mitigating threats.",

"Security in the cloud requires a holistic approach." ,

"Cloud security is about aligning people, processes, and technology." ,

"In the cloud, security is a continuous commitment." ,

"Cloud security is about building resilience and preparedness.",

"Security in the cloud is about protecting the organization's reputation and trust.",

"Cloud security is about ensuring compliance with regulations and standards." ,

"In the cloud, security is about protecting the organization's most valuable asset: data." ,

"Cloud security is about enabling secure collaboration and productivity.",

"Security in the cloud is about anticipating and responding to threats.", 

"Cloud security is about building a secure and sustainable future." ,

"In the cloud, security is about empowering the organization to innovate securely." ,

"Cloud security is about creating a secure and trusted environment for business growth." ,
];

const QuoteBox = () => {
  const [quote, setQuote] = useState("");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const played = sessionStorage.getItem("played");
    if (!played) {
      setAnimating(true);
      sessionStorage.setItem("played", "true");
  }
}, []);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  return (
    <div className={`quote-box ${animating ? "animate" : ""}`}>
      <Sparkles size={18} className="quote-icon" />
      <p className="quote-text">{quote}</p>
    </div>
  );
};

export default QuoteBox;
