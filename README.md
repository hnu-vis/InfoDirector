# Enhancing the Expressive Power of Text by Animating the Paired Infographic Chart

## 📂 Resources
- **Detection Dataset:** [Google drive](https://drive.google.com/file/d/1nrSHx2WFB0NImy0cKxoygdyweNiPWVu2/view).
- **Online Demo:** [Web](http://45.76.149.41:3000/).

## 📌 Abstract
Infographic charts are widely used alongside texts to convey information more effectively in real-world scenarios (e.g., digital newspapers). In such contexts, animations are commonly employed to direct the audience’s attention to chart regions associated with the texts. Although there are many automatic animation generation methods proposed to reduce the time and effort in creating such animations, they are typically designed for plain charts and cannot well characterize the animation patterns of infographic charts (e.g., nested animations). To address the issue, we first collected 1,082 infographic chart animations from reputable sources. Through a deep analysis of the collection with experts, we obtain a comprehensive design space with four dimensions (Message, Scene, Character, and Plot), which can better characterize the animation patterns of infographic charts. Informed by this design space, we develop InfoDirector, an interactive tool for generating infographic chart animations according to provided texts. To support accurate element parsing in InfoDirector, we carefully annotated 2,827 infographic charts for fine-tuning a pretrained detection model, which achieves SOTA performance. A comprehensive user study with 60 participants demonstrates that our method outperforms baseline methods in data comprehension, expressiveness, and visual attractiveness.

## ✨ Key Contributions
- **Design Space:** propose a design space that orchestrates the coordinated animation of infographic charts across four dimensions (Message, Scene, Character, and Plot).  
- **InfoDirector:** Developed an interactive tool that automatically generates infographic chart animations from textual descriptions.  
- **User Study:** Demonstrated significant improvements in comprehension, expressiveness, and visual appeal through evaluation with 60 participants.  
