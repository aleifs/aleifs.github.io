---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% if author.googlescholar %}
  You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u>
{% endif %}

{% include base_path %}

{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
{% for post in site.rr reversed %}
  {% include archive-single.html %}
{% endfor %}

## Working Papers
{% for post in site.wp reversed %}
  {% include archive-single.html %}
{% endfor %}

## Work in Progress
{% for post in site.workinprogress reversed %}
  {% include archive-single.html %}
{% endfor %}