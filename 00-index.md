---
title: Home
# metadata-files:
#   - _metadata.yml
layout: default
description: Accelerating the Adoption of open-Source Assistive Technology 
nav: false
permalink: index.html
---
> <dfn><strong>a11yhood</strong></dfn> Accelerating the Adoption of Open Source Assistive Technology

## <strong>a11yhood</strong> News

<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a> <span>{{ post.description }}</span>
    </li>
  {% endfor %}
</ul>

##  Try it out!

<a href="https://a11yhood.cs.washington.edu/">A11yhood.org Search Interface</a> 


