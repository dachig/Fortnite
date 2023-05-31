// zoekt naar objecten met de class "start" dat zichtbaar zijn op jouw scherm en voegt "end" eraan toe om de animatie te laten spelen.
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry)

        if(entry.isIntersecting){
            entry.target.classList.add('end');
        } else {
            entry.target.classList.remove('end');
        }
        
    });
 });

 const hiddenElements = document.querySelectorAll('.start');
 hiddenElements.forEach((el) => observer.observe(el));

// source & guide: https://youtu.be/T33NN_pPeNI