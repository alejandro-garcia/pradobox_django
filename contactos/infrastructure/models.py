from django.db import models


class CountryModel(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'country'
        verbose_name = 'Country'
        verbose_name_plural = 'Countries'

    def __str__(self) -> str:
        return self.name


class ContactModel(models.Model):
    # Relación con cliente
    #client = models.ForeignKey('cliente.ClienteModel', on_delete=models.SET_NULL, related_name='contacts', null=True)
    client = models.CharField(max_length=10, db_column='co_cli', blank=True, null=True)

    # Campos solicitados
    name = models.CharField(max_length=200, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'contact'
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'

    def __str__(self) -> str:
        return self.name or f"{self.first_name or ''} {self.last_name or ''}".strip() or f"Contact {self.pk}"


class ContactPhoneModel(models.Model):
    PHONE_TYPES = [
        ('work', 'Trabajo'),
        ('mobile', 'Móvil'),
        ('fax', 'Fax'),
        ('home', 'Casa'),
        ('skype', 'Skype'),
        ('other', 'Otro'),
    ]

    contact = models.ForeignKey(ContactModel, on_delete=models.CASCADE, related_name='phones')
    phone = models.CharField(max_length=50)
    phone_type = models.CharField(max_length=10, choices=PHONE_TYPES, default='other')

    class Meta:
        db_table = 'contact_phone'
        verbose_name = 'Contact Phone'
        verbose_name_plural = 'Contact Phones'

    def __str__(self) -> str:
        return f"{self.phone} ({self.phone_type})"


class ContactEmailModel(models.Model):
    MAIL_TYPES = [
        ('work', 'Trabajo'),
        ('personal', 'Personal'),
        ('other', 'Otro'),
    ]

    contact = models.ForeignKey(ContactModel, on_delete=models.CASCADE, related_name='emails')
    email = models.EmailField()
    mail_type = models.CharField(max_length=10, choices=MAIL_TYPES, default='other')

    class Meta:
        db_table = 'contact_email'
        verbose_name = 'Contact Email'
        verbose_name_plural = 'Contact Emails'

    def __str__(self) -> str:
        return f"{self.email} ({self.mail_type})"


class ContactAddressModel(models.Model):
    contact = models.ForeignKey(ContactModel, on_delete=models.CASCADE, related_name='addresses')
    address = models.TextField()
    state = models.CharField(max_length=100, blank=True, null=True)
    zipcode = models.CharField(max_length=20, blank=True, null=True)
    country = models.ForeignKey(CountryModel, on_delete=models.PROTECT, related_name='addresses')

    class Meta:
        db_table = 'contact_address'
        verbose_name = 'Contact Address'
        verbose_name_plural = 'Contact Addresses'

    def __str__(self) -> str:
        return f"{self.address[:30]}..." if len(self.address) > 30 else self.address
