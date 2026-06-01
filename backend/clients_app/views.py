# backend/clients_app/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse

from .models import Client
from .serializers import ClientSerializer, DeleteClientSerializer
from receipts_app.utils import generate_client_pdf


class ClientListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Client.objects.all()
        search = request.query_params.get('search')
        client_type = request.query_params.get('type')
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(phone_number__icontains=search)
        if client_type:
            qs = qs.filter(client_type=client_type)
        return Response(ClientSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ClientSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        client = serializer.save()
        return Response(ClientSerializer(client).data, status=status.HTTP_201_CREATED)


class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, pk):
        try:
            return Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return None

    def get(self, request, pk):
        client = self._get_object(pk)
        if not client:
            return Response({'error': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClientSerializer(client).data)

    def put(self, request, pk):
        client = self._get_object(pk)
        if not client:
            return Response({'error': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ClientSerializer(client, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        ser = DeleteClientSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_passkey(ser.validated_data['passkey']):
            return Response({'error': 'Invalid passkey.'}, status=status.HTTP_403_FORBIDDEN)
        client = self._get_object(pk)
        if not client:
            return Response({'error': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)
        client.delete()
        return Response({'message': 'Client deleted.'})


class ClientPrintView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            client = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response({'error': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)
        pdf_buffer = generate_client_pdf(client)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="client_{client.id}.pdf"'
        return response
