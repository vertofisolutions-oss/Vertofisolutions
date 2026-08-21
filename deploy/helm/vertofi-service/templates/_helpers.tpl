{{- define "vertofi.name" -}}
{{- .Values.name -}}
{{- end -}}

{{- define "vertofi.labels" -}}
app.kubernetes.io/name: {{ include "vertofi.name" . }}
app.kubernetes.io/part-of: vertofi
app.kubernetes.io/managed-by: helm
{{- end -}}

{{- define "vertofi.selectorLabels" -}}
app.kubernetes.io/name: {{ include "vertofi.name" . }}
{{- end -}}
