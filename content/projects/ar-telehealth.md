---
title: "AR Telehealth with HoloLens 2"
description: "A proof of concept that let a remote doctor see, hear and monitor a patient through a nurse's HoloLens 2."
date: 2022-08-15
draft: false
origin: professional
cover: /img/projects/ar-telehealth/cover.jpg
coverAlt: "Painted collage of a nurse in a mixed reality headset holding a stethoscope to an elderly patient in bed, while floating panels show a remote doctor and the patient's vital signs"
stack:
  - hololens-2
  - jitsi
  - webrtc
  - mqtt
  - rabbitmq
  - android
  - gcp
---

![Painted collage of a nurse in a mixed reality headset holding a stethoscope to an elderly patient in bed, while floating panels show a remote doctor and the patient's vital signs](/img/projects/ar-telehealth/cover.jpg)

From 2022 into 2023 I worked as lead developer on an augmented reality telehealth prototype, a collaboration between La Trobe University, Cisco Innovation Central Melbourne and Northern Health's Victorian Virtual Emergency Department. I was employed by La Trobe, and my role was funded by Cisco. The aim was to bring a doctor's eyes and ears to a patient in another place.

Northern Health and La Trobe set up the Virtual ED in 2020, during the COVID-19 pandemic, to [give non-urgent patients emergency care by video](https://www.latrobe.edu.au/industry-and-community/la-trobe-industry/case-studies/an-emergency-department-like-no-other) from anywhere in Victoria. This helps places where a doctor is hard to get in person, such as remote clinics and aged care homes. In aged care, almost any event leads to an ambulance trip, even when the visit is only for a check-up and back. The trip is hard on an elderly resident, and it ties up an ambulance that could go to a more urgent case.

A video consultation can avoid that trip, but it still needs someone at the patient's side to hold the camera. In an aged care home that often means [two staff members](https://www.abc.net.au/news/2023-05-19/regional-victoria-aged-care-trial-vr-remote-doctor-exams-visits/102356004): a nurse with the resident, and a second person filming with a phone or tablet. Staff are scarce, so the Virtual ED's challenge to us was to free the nurse's hands.

Our answer was to put a Microsoft HoloLens 2 headset on the nurse. Through it, the doctor could see and hear what the nurse did, including the sound of a digital stethoscope, and watch the patient's vital signs arrive live from Bluetooth medical devices. La Trobe [described the aim](https://www.latrobe.edu.au/news/articles/2023/release/virtual-emergency-departments-to-nursing-homes) as letting aged care residents be "diagnosed, treated and monitored in situ without the cost and distress of having to be transported to hospital".

## How it worked

![A man in scrubs wearing a HoloLens 2 stands beside a seated woman who holds a stethoscope to her chest; behind them a monitor shows two people on a video call beside a panel of readings](/img/projects/ar-telehealth/hololens-portal.jpg "The prototype in use. Photo: La Trobe University.")

The nurse wore the HoloLens 2, which opened our web portal in its browser and joined a video call through it. The doctor opened the same portal on an ordinary computer. The portal showed the call on the left and the patient's live readings on the right: blood pressure, blood oxygen, heart rate, temperature and a graph of the pulse wave. We ran the call on Jitsi, an open-source video-conferencing server, hosted on Google Cloud.

The stethoscope was central to the project. Northern Health told us that if a remote doctor could hear a patient's breathing clearly through a stethoscope over the video link, it would give their doctors a tool they did not have. Heart sounds were useful, but breath sounds mattered more. We used a Thinklabs digital stethoscope and fed its sound into the call. Jitsi normally filters call audio to favour voices, so we turned that filtering off to carry the stethoscope's sound at full fidelity.

The readings came from three iHealth Bluetooth devices: a blood pressure monitor, a pulse oximeter and a thermometer. An Android phone read them through iHealth's software development kit, and we added an MQTT client to the phone's app so that it published each reading to a RabbitMQ message broker. The portal subscribed to the broker and updated as each reading arrived.

We hosted every part of the system ourselves. It carried medical data, so we wanted to control the whole pipeline, from the devices to the doctor's screen, and keep that data private.

## Outcome

The prototype became the flagship demonstration of La Trobe's innovation space at the Bundoora campus, and it was in constant use to show what the team and the space could do. We demonstrated it to strategic partners and at technology and medical events, at La Trobe and at other sites.

![A doctor wearing a HoloLens 2 sits beside a stand-in patient in a hospital bed, while a group of people watch from around the bed](/img/projects/ar-telehealth/lab-demonstration.jpg "A demonstration at La Trobe. Photo: Innovation Central Melbourne.")

In 2022, Cisco made the project the subject of a short film, [A university, a network, and three brilliant students](https://video.cisco.com/detail/video/6308004121112), and [featured it on its education blog](https://blogs.cisco.com/education/three-students-from-australias-la-trobe-university-were-given-the-academic-and-industry-support-a-tight-timeframe-and-a-supervisor-to-come-up-with-a-digital-solution-for-our-health-sector). In May 2023, ABC News [reported on the project](https://www.abc.net.au/news/2023-05-19/regional-victoria-aged-care-trial-vr-remote-doctor-exams-visits/102356004), and La Trobe [published a media release about it](https://www.latrobe.edu.au/news/articles/2023/release/virtual-emergency-departments-to-nursing-homes).

<figure class="video-embed">
<a class="video-poster" href="https://video.cisco.com/detail/video/6308004121112" data-embed="https://players.brightcove.net/1384193102001/SylXkiJb_default/index.html?videoId=6308004121112&amp;autoplay=true"><img src="/img/projects/ar-telehealth/cisco-film-poster.jpg" alt="Cisco's film about the project, A university, a network, and three brilliant students, 2 minutes 32 seconds" width="1280" height="720"><span class="video-badge" aria-hidden="true">2:32 · plays from Cisco</span></a>
<figcaption>Cisco's film about the project, 2022.</figcaption>
</figure>

## Coverage

- ABC News, 19 May 2023: [Augmented reality bringing doctors' eyes and ears to remote medical exams in aged care](https://www.abc.net.au/news/2023-05-19/regional-victoria-aged-care-trial-vr-remote-doctor-exams-visits/102356004)
- ABC News Breakfast, 19 May 2023: [studio segment](https://www.youtube.com/watch?v=8jEgXYc03NY) (video, 6:44)
- La Trobe University, 19 May 2023: [Virtual emergency departments to nursing homes](https://www.latrobe.edu.au/news/articles/2023/release/virtual-emergency-departments-to-nursing-homes)
- La Trobe University: [An emergency department like no other](https://www.latrobe.edu.au/industry-and-community/la-trobe-industry/case-studies/an-emergency-department-like-no-other) (case study on the Virtual ED)
- Innovation Central Melbourne, 30 August 2023: [Cisco Innovation Central Melbourne explores use of AR technology to virtually bring doctors into aged care homes](https://icentralau.com.au/melbourne/cisco-innovation-central-melbourne-explores-use-of-ar-technology-to-virtually-bring-doctors-into-aged-care-homes/)
- Innovation Central Melbourne: [Enhancing telehealth](https://icentralau.com.au/melbourne/case-studies/cisco-innovation-central-melbourne-join-forces-with-northern-health-in-a-pioneering-partnership-to-redefine-telehealth/) (case study)
- Cisco Blogs, 14 August 2022: [Developing our future talent by engaging in solving real world challenges](https://blogs.cisco.com/education/three-students-from-australias-la-trobe-university-were-given-the-academic-and-industry-support-a-tight-timeframe-and-a-supervisor-to-come-up-with-a-digital-solution-for-our-health-sector)
- Cisco Video Portal, 2022: [A university, a network, and three brilliant students](https://video.cisco.com/detail/video/6308004121112)
