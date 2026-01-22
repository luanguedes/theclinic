class Exame(models.Model):
    TIPO_CHOICES = [
        ('Consulta', 'Consulta'),
        ('Exame', 'Exame'),
        ('Procedimento Clínico', 'Procedimento Clínico'),
        ('Cirurgia/Intervenção', 'Cirurgia/Intervenção'),
    ]

    codigo_tuss = models.CharField(max_length=20, unique=True, db_index=True)
    nome = models.CharField(max_length=500)
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES, default='Exame')
    
    # Campo desnormalizado para busca rápida (opcional mas recomendado)
    search_text = models.CharField(max_length=600, db_index=True)

    def __str__(self):
        return f"{self.nome} ({self.codigo_tuss})"